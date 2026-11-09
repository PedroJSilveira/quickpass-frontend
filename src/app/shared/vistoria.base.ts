import { Directive, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { mensagemErro } from '../core/api/api.service';
import { Vistoria } from '../core/models/domain.models';
import { AppConfigService } from '../core/config/app-config.service';
import { AuthService } from '../core/services/auth.service';
import { BookingService } from '../core/services/booking.service';
import { CatalogService } from '../core/services/catalog.service';
import { UploadQueueService } from '../core/services/upload-queue.service';
import { FotoEscolhida } from './components/vistoria-fotos.component';

/**
 * Lógica comum de check-in e check-out: a vistoria é UMA só por reserva e fica no servidor, onde
 * locatário e proprietário (contas diferentes) enviam fotos, aceitam e concluem. A tela busca o
 * estado periodicamente para mostrar o aceite da outra parte.
 */
@Directive()
export abstract class VistoriaBase implements OnInit, OnDestroy {
  protected abstract readonly tipo: 'checkin' | 'checkout';

  protected booking = inject(BookingService);
  protected catalog = inject(CatalogService);
  protected router = inject(Router);
  protected queue = inject(UploadQueueService);
  protected config = inject(AppConfigService);
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  total = this.config.get('FOTOS_VISTORIA_OBRIGATORIAS');
  reservaId = computed(() => this.paramMap().get('id') ?? '');
  reserva = computed(() => this.booking.porId(this.reservaId()));
  detalhe = computed(() => this.booking.detalhe(this.reservaId()));
  veiculo = computed(() => {
    const r = this.reserva();
    return r ? this.catalog.porId(r.veiculoId) : undefined;
  });
  vistoria = signal<Vistoria | null>(null);
  erro = signal('');
  processando = signal(false);
  private enviandoFotos = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Cada parte aceita com a própria conta: o papel é decidido pela reserva, não pelo seletor de papel. */
  souLocatario = computed(() => !!this.reserva() && this.reserva()!.locatarioId === this.auth.conta().id);
  souProprietario = computed(() => !!this.reserva() && this.reserva()!.proprietarioId === this.auth.conta().id);

  fotosFeitas = computed(() => (this.vistoria() ? this.booking.contarFotos(this.vistoria()!.fotos) : 0));
  podeConfirmar = computed(() => {
    const v = this.vistoria();
    return !!v && this.fotosFeitas() >= this.total && v.aceiteLocatario && v.aceiteProprietario && !this.processando();
  });

  async ngOnInit(): Promise<void> {
    const d = await this.booking.carregarDetalhe(this.reservaId());
    if (d) await this.catalog.carregar(d.reserva.veiculoId);
    await this.sincronizar(true);
    this.timer = setInterval(() => void this.sincronizar(false), 5000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Busca a vistoria no servidor. Nas atualizações periódicas preserva o que está sendo digitado/enviado agora. */
  protected async sincronizar(inicial: boolean): Promise<void> {
    try {
      const doServidor = await this.booking.carregarVistoria(this.reservaId(), this.tipo);
      const local = this.vistoria();
      if (!local || inicial) {
        this.vistoria.set(doServidor);
        return;
      }
      this.vistoria.set({
        ...local,
        aceiteLocatario: doServidor.aceiteLocatario,
        aceiteProprietario: doServidor.aceiteProprietario,
        fotos: this.enviandoFotos > 0 ? local.fotos : doServidor.fotos,
      });
      // Se a outra parte concluiu enquanto isso, o estado da reserva mudou.
      await this.booking.carregarDetalhe(this.reservaId());
    } catch (e) {
      if (inicial) this.erro.set(mensagemErro(e));
    }
  }

  atualizar(patch: Partial<Vistoria>): void {
    this.vistoria.update((v) => (v ? { ...v, ...patch } : v));
  }

  /** Grava km/combustível/observações no servidor (ao sair do campo). */
  async salvarDados(): Promise<void> {
    const v = this.vistoria();
    if (!v) return;
    try {
      await this.booking.salvarDadosVistoria(this.reservaId(), this.tipo, { km: v.km, combustivel: v.combustivel, observacoes: v.observacoes });
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }

  /** Foto escolhida: comprime, enfileira e sobe em multipart; só vira "enviada" depois do 200 do servidor. */
  async aoEscolherFoto(e: FotoEscolhida): Promise<void> {
    const alterar = (patch: Partial<Vistoria['fotos'][typeof e.chave]>) =>
      this.vistoria.update((v) => (v ? { ...v, fotos: { ...v.fotos, [e.chave]: { ...v.fotos[e.chave], ...patch } } } : v));
    this.enviandoFotos++;
    try {
      await this.queue.enfileirar(e.arquivo, alterar, (blob, progresso) => this.booking.enviarFoto(this.reservaId(), this.tipo, e.chave, blob, progresso));
    } finally {
      this.enviandoFotos--;
    }
  }

  async aceitar(): Promise<void> {
    this.erro.set('');
    try {
      await this.salvarDados();
      const v = await this.booking.aceitarVistoria(this.reservaId(), this.tipo);
      this.atualizar({ aceiteLocatario: v.aceiteLocatario, aceiteProprietario: v.aceiteProprietario });
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }
}

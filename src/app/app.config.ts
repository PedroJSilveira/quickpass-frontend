import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { LucideAngularModule, Car, Search, ClipboardList, User, LayoutDashboard, CarFront, Inbox, Wallet, ExternalLink, Bell, Bookmark, ShieldCheck, ClipboardCheck } from 'lucide-angular';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { apiInterceptor } from './core/api/api.interceptor';
import { AppConfigService } from './core/config/app-config.service';
import { AuthService } from './core/services/auth.service';
import { AttributionService } from './core/services/attribution.service';

/**
 * Preset do PrimeNG casado com o design system Industry: cantos sempre retos
 * (o padrão "blueprint" nunca arredonda, ver README) e a mesma rampa de cor
 * accent já usada em styles.css (--color-accent-100..900).
 */
const IndustryPreset = definePreset(Aura, {
  primitive: {
    borderRadius: { none: '0', xs: '0', sm: '0', md: '0', lg: '0', xl: '0' },
  },
  semantic: {
    primary: {
      50: '#eef6ff',
      100: '#eef6ff',
      200: '#d6ebff',
      300: '#b5d9fd',
      400: '#94bce3',
      500: '#749dc4',
      600: '#597ea3',
      700: '#416180',
      800: '#2c455d',
      900: '#1d2d3d',
      950: '#141f2b',
    },
  },
});

const ptBR = {
  dayNames: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
  dayNamesShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  monthNames: [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ],
  monthNamesShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  today: 'Hoje',
  clear: 'Limpar',
  weekHeader: 'Sem',
  firstDayOfWeek: 0,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([apiInterceptor])),
    {
      // Captura first-touch (RF08), carrega os parâmetros do servidor e retoma a sessão salva (token).
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const attribution = inject(AttributionService);
        const config = inject(AppConfigService);
        const auth = inject(AuthService);
        return async () => {
          attribution.capturar();
          await Promise.all([config.carregar(), auth.restaurar()]);
        };
      },
    },
    providePrimeNG({
      theme: { preset: IndustryPreset, options: { darkModeSelector: false } },
      translation: ptBR,
    }),
    importProvidersFrom(
      LucideAngularModule.pick({ Car, Search, ClipboardList, User, LayoutDashboard, CarFront, Inbox, Wallet, ExternalLink, Bell, Bookmark, ShieldCheck, ClipboardCheck }),
    ),
  ],
};

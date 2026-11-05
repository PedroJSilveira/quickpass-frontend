import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, inject, provideZoneChangeDetection, Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { LucideAngularModule, Car, Search, ClipboardList, User, LayoutDashboard, CarFront, Inbox, Wallet, ExternalLink, Bell, Bookmark } from 'lucide-angular';
import { routes } from './app.routes';
import { ADAPTER_PROVIDERS } from './core/adapters/adapters.providers';
import { AttributionService } from './core/services/attribution.service';
import { SchedulerService } from './core/services/scheduler.service';
import { SessionService } from './core/services/session.service';
import { DisputeService } from './core/services/dispute.service';
import { BookingService } from './core/services/booking.service';
import { ReviewService } from './core/services/review.service';
import { SavedSearchService } from './core/services/saved-search.service';
import { SupplyHealthService } from './core/services/supply-health.service';
import { AgendaReminderService } from './core/services/agenda-reminder.service';
import { LocalDemandAlertService } from './core/services/local-demand-alert.service';

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
    ...ADAPTER_PROVIDERS,
    {
      // Captura first-touch (RF08), instancia os services com jobs, inicia sessão (RF15) e o agendador.
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const attribution = inject(AttributionService);
        const session = inject(SessionService);
        const scheduler = inject(SchedulerService);
        // Instancia os services que registram jobs no agendador.
        const servicos: Type<unknown>[] = [BookingService, DisputeService, ReviewService, SavedSearchService, SupplyHealthService, AgendaReminderService, LocalDemandAlertService];
        servicos.forEach((t) => inject(t));
        return () => {
          attribution.capturar();
          session.iniciar();
          scheduler.iniciar();
        };
      },
    },
    providePrimeNG({
      theme: { preset: IndustryPreset, options: { darkModeSelector: false } },
      translation: ptBR,
    }),
    importProvidersFrom(
      LucideAngularModule.pick({ Car, Search, ClipboardList, User, LayoutDashboard, CarFront, Inbox, Wallet, ExternalLink, Bell, Bookmark }),
    ),
  ],
};

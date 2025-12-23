import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'tab1',
        loadComponent: () =>
          import('../tab1/tab1.page').then((m) => m.Tab1Page),
      },
      {
        path: 'tab2',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('../tab2/tab2.page').then((m) => m.Tab2Page),
          },
          {
            path: 'strategy/:id',
            loadComponent: () =>
              import('../pages/strategy-detail/strategy-detail.page').then((m) => m.StrategyDetailPage),
          },
        ],
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('../pages/ai-chat/ai-chat.page').then((m) => m.AiChatPage),
      },
      {
        path: 'tab3',
        loadComponent: () =>
          import('../tab3/tab3.page').then((m) => m.Tab3Page),
      },
      {
        path: '',
        redirectTo: '/tabs/tab1',
        pathMatch: 'full',
      },
    ],
  },
];

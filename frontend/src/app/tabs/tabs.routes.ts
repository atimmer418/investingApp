import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  { path: '', redirectTo: 'tab1', pathMatch: 'full' },
  { path: ':tab', component: TabsPage },
];


export enum RequestType {
  SALDO_INICIAL = 'Saldo Inicial',
  DESCONTO = 'Desconto do saldo de férias',
  AGENDADAS = 'Férias agendadas no RH',
  ABONO_PECUNIARIO = 'Abono Pecuniário'
}

export enum HolidayType {
  NACIONAL = 'Nacional',
  ESTADUAL = 'Estadual',
  MUNICIPAL = 'Municipal'
}

export enum UserRole {
  ADMIN = 'Administrador',
  VIEWER = 'Visualizador'
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  addedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  unit: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // ISO format YYYY-MM-DD
  type: HolidayType;
  state?: string;
  unit?: string; 
}

export interface Collaborator {
  id: string;
  name: string;
  role: string;
  unit: string;
  state: string;
}

export interface VacationRecord {
  id: string;
  collaboratorId: string;
  type: RequestType;
  startDate: string;
  endDate: string;
  calendarDays: number;
  businessDays: number;
  holidaysCount: number;
  attachmentName?: string;
  attachmentData?: string; 
  unit: string;
  state: string;
  observation?: string; 
  usuarioEdicao?: string;
  dataHoraEdicao?: string;
  statusEdicao?: 'editando' | 'salvo' | 'excluido';
}

export interface ImportHistory {
  id: string;
  date: string;
  userName: string;
  fileName: string;
  recordsCount: number;
  status: 'Sucesso' | 'Erro';
}

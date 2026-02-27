
import { Holiday, HolidayType, Collaborator, RequestType, VacationRecord } from './types';

export const INITIAL_HOLIDAYS: Holiday[] = [
  { id: '1', name: 'Confraternização Universal', date: '2024-01-01', type: HolidayType.NACIONAL },
  { id: '2', name: 'Tiradentes', date: '2024-04-21', type: HolidayType.NACIONAL },
  { id: '3', name: 'Dia do Trabalho', date: '2024-05-01', type: HolidayType.NACIONAL },
  { id: '4', name: 'Independência do Brasil', date: '2024-09-07', type: HolidayType.NACIONAL },
  { id: '5', name: 'Nossa Senhora Aparecida', date: '2024-10-12', type: HolidayType.NACIONAL },
  { id: '6', name: 'Finados', date: '2024-11-02', type: HolidayType.NACIONAL },
  { id: '7', name: 'Proclamação da República', date: '2024-11-15', type: HolidayType.NACIONAL },
  { id: '8', name: 'Natal', date: '2024-12-25', type: HolidayType.NACIONAL },
  { id: '9', name: 'Revolução Constitucionalista', date: '2024-07-09', type: HolidayType.ESTADUAL, state: 'SP' },
];

export const INITIAL_COLLABORATORS: Collaborator[] = [
  { id: 'c1', name: 'Alice Silva', role: 'Desenvolvedora Senior', unit: 'SEDE', state: 'SP' },
  { id: 'c2', name: 'Bruno Santos', role: 'Gerente de RH', unit: 'SEDE', state: 'RS' },
];

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const INITIAL_RECORDS: VacationRecord[] = [
  {
    id: 'r1',
    collaboratorId: 'c1',
    type: RequestType.SALDO_INICIAL,
    startDate: '2024-01-01',
    endDate: '2024-01-01',
    calendarDays: 1,
    businessDays: 30, // Manual override for initial balance
    holidaysCount: 0,
    unit: 'SEDE',
    state: 'SP'
  }
];

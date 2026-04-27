import { Holiday } from '../types';

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};

export const getHolidaysInRange = (
  start: Date,
  end: Date,
  holidays: Holiday[],
  state: string
): Holiday[] => {
  return holidays.filter(holiday => {
    const holidayDate = new Date(holiday.date + 'T00:00:00');
    if (holidayDate < start || holidayDate > end) return false;

    // National holidays apply to everyone
    if (holiday.type === 'Nacional') return true;

    // State holidays apply if state matches
    if (holiday.type === 'Estadual' && holiday.state === state) return true;

    return false;
  });
};

export const calculateVacationMetrics = (
  startDate: string,
  endDate: string,
  state: string,
  holidays: Holiday[]
) => {
  if (!startDate || !endDate) {
    return { calendarDays: 0, businessDays: 0, holidaysCount: 0 };
  }

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { calendarDays: 0, businessDays: 0, holidaysCount: 0 };
  }

  // Calendar days: inclusive
  // Fórmula: dias_corridos = (data_fim - data_inicio) + 1
  const calendarDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Get holidays in range
  const holidaysInRange = getHolidaysInRange(start, end, holidays, state);
  
  // Business days: exclude weekends and holidays
  // Excluir da contagem: sábados, domingos, feriados nacionais, feriados estaduais do estado do colaborador
  let businessDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const isHoliday = holidaysInRange.some(h => h.date === dateStr);
    
    if (!isWeekend(current) && !isHoliday) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return {
    calendarDays,
    businessDays,
    holidaysCount: holidaysInRange.length
  };
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const getAdjustedBusinessDays = (type: string, businessDays: number, calendarDays: number): number => {
  if (type === 'Férias Agendadas no RH') {
    if (calendarDays === 20) return 15;
    if (calendarDays === 30) return 22;
  }
  return businessDays;
};

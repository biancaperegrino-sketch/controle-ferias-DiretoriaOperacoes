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
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { calendarDays: 0, businessDays: 0, holidaysCount: 0 };
  }

  // Calendar days: inclusive
  const calendarDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Get holidays in range
  const holidaysInRange = getHolidaysInRange(start, end, holidays, state);
  
  // Business days: exclude weekends and holidays
  let businessDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const isHoliday = holidaysInRange.some(h => h.date === current.toISOString().split('T')[0]);
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

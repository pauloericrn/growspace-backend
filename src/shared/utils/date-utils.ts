import { parseISO, addDays, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import * as tz from 'date-fns-tz';

// Timezone de Brasília
const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Utilitários para manipulação de datas com timezone de Brasília
 */
export class DateUtils {
  /**
   * Converte uma data para UTC (para salvar no banco)
   */
  static toUTC(date: Date | string): Date {
    if (typeof date === 'string') {
      date = parseISO(date);
    }
    return tz.fromZonedTime(date, BRAZIL_TIMEZONE);
  }

  /**
   * Converte uma data UTC para timezone de Brasília
   */
  static fromUTC(utcDate: Date | string): Date {
    if (typeof utcDate === 'string') {
      utcDate = parseISO(utcDate);
    }
    return tz.toZonedTime(utcDate, BRAZIL_TIMEZONE);
  }

  /**
   * Formata uma data para exibição em Brasília
   */
  static formatBrazilian(date: Date | string, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
    const utcDate = this.toUTC(date);
    return tz.formatInTimeZone(utcDate, BRAZIL_TIMEZONE, formatStr);
  }

  /**
   * Formata uma data para exibição em Brasília (apenas data)
   */
  static formatBrazilianDate(date: Date | string): string {
    return this.formatBrazilian(date, 'dd/MM/yyyy');
  }

  /**
   * Formata uma data para exibição em Brasília (apenas hora)
   */
  static formatBrazilianTime(date: Date | string): string {
    return this.formatBrazilian(date, 'HH:mm');
  }

  /**
   * Formata uma data para exibição em Brasília (data e hora)
   */
  static formatBrazilianDateTime(date: Date | string): string {
    return this.formatBrazilian(date, 'dd/MM/yyyy HH:mm');
  }

  /**
   * Obtém a data atual em Brasília
   */
  static nowBrazilian(): Date {
    return tz.toZonedTime(new Date(), BRAZIL_TIMEZONE);
  }

  /**
   * Obtém a data atual em UTC
   */
  static nowUTC(): Date {
    return tz.fromZonedTime(new Date(), BRAZIL_TIMEZONE);
  }

  /**
   * Adiciona dias a uma data (considerando timezone)
   */
  static addDaysBrazilian(date: Date | string, days: number): Date {
    const brazilianDate = this.fromUTC(date);
    const newDate = addDays(brazilianDate, days);
    return this.toUTC(newDate);
  }

  /**
   * Verifica se uma data é anterior a outra (considerando timezone)
   */
  static isBeforeBrazilian(date1: Date | string, date2: Date | string): boolean {
    const brazilianDate1 = this.fromUTC(date1);
    const brazilianDate2 = this.fromUTC(date2);
    return isBefore(brazilianDate1, brazilianDate2);
  }

  /**
   * Verifica se uma data é posterior a outra (considerando timezone)
   */
  static isAfterBrazilian(date1: Date | string, date2: Date | string): boolean {
    const brazilianDate1 = this.fromUTC(date1);
    const brazilianDate2 = this.fromUTC(date2);
    return isAfter(brazilianDate1, brazilianDate2);
  }

  /**
   * Obtém o início do dia em Brasília
   */
  static startOfDayBrazilian(date: Date | string): Date {
    const brazilianDate = this.fromUTC(date);
    const start = startOfDay(brazilianDate);
    return this.toUTC(start);
  }

  /**
   * Obtém o fim do dia em Brasília
   */
  static endOfDayBrazilian(date: Date | string): Date {
    const brazilianDate = this.fromUTC(date);
    const end = endOfDay(brazilianDate);
    return this.toUTC(end);
  }

  /**
   * Converte string de data para Date (assumindo formato brasileiro)
   */
  static parseBrazilianDate(dateString: string): Date {
    // Assumindo formato dd/MM/yyyy ou dd/MM/yyyy HH:mm
    const [rawDatePart, rawTimePart] = (dateString || '').trim().split(' ');
    if (!rawDatePart) {
      throw new Error('Invalid date string');
    }
    const [dayStr, monthStr, yearStr] = rawDatePart.split('/');
    if (!dayStr || !monthStr || !yearStr) {
      throw new Error('Invalid date format. Expected dd/MM/yyyy or dd/MM/yyyy HH:mm');
    }
    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr);
    let date = new Date(year, month - 1, day);
    
    if (rawTimePart) {
      const [hourStr, minuteStr] = rawTimePart.split(':');
      const hour = Number(hourStr ?? '0');
      const minute = Number(minuteStr ?? '0');
      date.setHours(hour, minute, 0, 0);
    }
    
    return this.toUTC(date);
  }

  /**
   * Formata data para ISO string (UTC)
   */
  static toISOString(date: Date | string): string {
    const utcDate = this.toUTC(date);
    return utcDate.toISOString();
  }

  /**
   * Formata data para exibição amigável
   */
  static formatFriendly(date: Date | string): string {
    const brazilianDate = this.fromUTC(date);
    const now = this.nowBrazilian();
    const diffInHours = Math.abs(now.getTime() - brazilianDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return this.formatBrazilianTime(date);
    } else if (diffInHours < 48) {
      return `Ontem às ${this.formatBrazilianTime(date)}`;
    } else {
      return this.formatBrazilianDate(date);
    }
  }
}

// Exportar funções utilitárias para uso direto
export const toUTC = (date: Date | string) => DateUtils.toUTC(date);
export const fromUTC = (utcDate: Date | string) => DateUtils.fromUTC(utcDate);
export const formatBrazilian = (date: Date | string, formatStr: string = 'dd/MM/yyyy HH:mm') =>
  DateUtils.formatBrazilian(date, formatStr);
export const formatBrazilianDate = (date: Date | string) => DateUtils.formatBrazilianDate(date);
export const formatBrazilianTime = (date: Date | string) => DateUtils.formatBrazilianTime(date);
export const formatBrazilianDateTime = (date: Date | string) => DateUtils.formatBrazilianDateTime(date);
export const nowBrazilian = () => DateUtils.nowBrazilian();
export const nowUTC = () => DateUtils.nowUTC();
export const addDaysBrazilian = (date: Date | string, days: number) => DateUtils.addDaysBrazilian(date, days);
export const isBeforeBrazilian = (date1: Date | string, date2: Date | string) =>
  DateUtils.isBeforeBrazilian(date1, date2);
export const isAfterBrazilian = (date1: Date | string, date2: Date | string) =>
  DateUtils.isAfterBrazilian(date1, date2);
export const startOfDayBrazilian = (date: Date | string) => DateUtils.startOfDayBrazilian(date);
export const endOfDayBrazilian = (date: Date | string) => DateUtils.endOfDayBrazilian(date);
export const parseBrazilianDate = (dateString: string) => DateUtils.parseBrazilianDate(dateString);
export const toISOString = (date: Date | string) => DateUtils.toISOString(date);
export const formatFriendly = (date: Date | string) => DateUtils.formatFriendly(date);
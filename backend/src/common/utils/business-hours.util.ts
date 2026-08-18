import { Injectable } from '@nestjs/common';
import {
  isWeekend,
  isWithinInterval,
  set,
  addHours,
  differenceInHours,
  addDays,
  startOfDay,
  endOfDay,
} from 'date-fns';

export interface BusinessHoursConfig {
  startHour: number; // 8 (8 AM)
  endHour: number; // 18 (6 PM)
  workingDays: number[]; // [1, 2, 3, 4, 5] Monday-Friday
  holidays: Date[]; // Public holidays
}

@Injectable()
export class BusinessHoursService {
  private readonly config: BusinessHoursConfig = {
    startHour: 8, // 8 AM
    endHour: 18, // 6 PM
    workingDays: [1, 2, 3, 4, 5], // Monday-Friday
    holidays: this.getGuineaEcuatorialHolidays(),
  };

  /**
   * Check if given date/time is within business hours
   */
  isBusinessHours(date: Date = new Date()): boolean {
    // Check if weekend
    if (isWeekend(date)) {
      return false;
    }

    // Check if holiday
    if (this.isHoliday(date)) {
      return false;
    }

    // Check if within working hours (8 AM - 6 PM)
    const hours = date.getHours();
    return hours >= this.config.startHour && hours < this.config.endHour;
  }

  /**
   * Check if given date is a public holiday
   */
  isHoliday(date: Date): boolean {
    const dateStr = this.getDateString(date);
    return this.config.holidays.some(
      (holiday) => this.getDateString(holiday) === dateStr,
    );
  }

  /**
   * Get next business hour from given date
   */
  getNextBusinessHour(from: Date = new Date()): Date {
    let nextDate = new Date(from);

    // If already in business hours, return as-is
    if (this.isBusinessHours(nextDate)) {
      return nextDate;
    }

    // If outside business hours today, move to next business day start
    while (!this.isBusinessHours(nextDate)) {
      // If weekend or holiday, move to next day
      if (isWeekend(nextDate) || this.isHoliday(nextDate)) {
        nextDate = addDays(startOfDay(nextDate), 1);
        nextDate = set(nextDate, {
          hours: this.config.startHour,
          minutes: 0,
          seconds: 0,
        });
        continue;
      }

      // If before business hours, set to start of business hours
      if (nextDate.getHours() < this.config.startHour) {
        nextDate = set(nextDate, {
          hours: this.config.startHour,
          minutes: 0,
          seconds: 0,
        });
      }
      // If after business hours, move to next day start
      else if (nextDate.getHours() >= this.config.endHour) {
        nextDate = addDays(startOfDay(nextDate), 1);
        nextDate = set(nextDate, {
          hours: this.config.startHour,
          minutes: 0,
          seconds: 0,
        });
      } else {
        break;
      }
    }

    return nextDate;
  }

  /**
   * Calculate business hours between two dates
   * (excluding weekends and holidays)
   */
  calculateBusinessHours(start: Date, end: Date): number {
    let totalHours = 0;
    let currentDate = new Date(start);

    while (currentDate < end) {
      if (this.isBusinessHours(currentDate)) {
        totalHours++;
      }
      currentDate = addHours(currentDate, 1);
    }

    return totalHours;
  }

  /**
   * Add business hours to a date
   * (skips weekends and holidays)
   */
  addBusinessHours(from: Date, hoursToAdd: number): Date {
    let resultDate = new Date(from);
    let hoursAdded = 0;

    while (hoursAdded < hoursToAdd) {
      resultDate = addHours(resultDate, 1);

      if (this.isBusinessHours(resultDate)) {
        hoursAdded++;
      }
    }

    return resultDate;
  }

  /**
   * Check if should send reminder now
   * (only during business hours)
   */
  shouldSendReminderNow(): boolean {
    return this.isBusinessHours(new Date());
  }

  /**
   * Get Guinea Ecuatorial public holidays
   */
  private getGuineaEcuatorialHolidays(): Date[] {
    const currentYear = new Date().getFullYear();

    return [
      // New Year's Day
      new Date(currentYear, 0, 1),

      // Good Friday (variable - approximate)
      new Date(currentYear, 3, 18),

      // Labour Day
      new Date(currentYear, 4, 1),

      // President's Birthday
      new Date(currentYear, 5, 5),

      // Armed Forces Day
      new Date(currentYear, 7, 3),

      // Constitution Day
      new Date(currentYear, 7, 15),

      // Independence Day
      new Date(currentYear, 9, 12),

      // Christmas Day
      new Date(currentYear, 11, 25),

      // Next year's New Year (if checking at year end)
      new Date(currentYear + 1, 0, 1),
    ];
  }

  /**
   * Helper to get date string for comparison (YYYY-MM-DD)
   */
  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get business hours configuration
   */
  getConfig(): BusinessHoursConfig {
    return { ...this.config };
  }

  /**
   * Check if given time is within business hours range
   */
  isTimeInBusinessHours(hours: number): boolean {
    return hours >= this.config.startHour && hours < this.config.endHour;
  }
}

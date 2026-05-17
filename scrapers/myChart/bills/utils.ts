

// This snippet implements a custom day‑count format referred to here as “dte.” 
// A dte represents the number of whole days elapsed since December 31, 1840, which is offset by 47,117 days from the standard Unix epoch of January 1, 1970. 
// The dte2date function takes an integer (dte), subtracts 47,117, multiplies that by the number of milliseconds in a day (86,400,000), 
// and adds the result to the Unix epoch date, returning a JavaScript Date object. 
// Conversely, date2dte calculates how many days have passed since January 1, 1970, 
// and then adds 47,117 to map it to this custom epoch. 
// This design ensures any integer dte can be converted to a specific date, and vice versa, while preserving midnight boundaries.


// These two functions came out of the JS source code in MyChart's frontend, then I had OpenAI clean them up and convert them to typescript. 

// 1840 Epoch is the epoch that is used by Mainframes (instead of 1970). 

/**
 * Converts a 'dte' number (days since 1840-12-31) into a JavaScript Date object.
 * @param dteNumber - The number of days since 1840-12-31
 * @returns A JavaScript Date object at local midnight
 */
import { logger } from '../../../shared/logger';
export function dte2date(dteNumber: number): Date {
  const baseDate = new Date(); // used to hold the Unix epoch at midnight
  baseDate.setUTCFullYear(1970, 0, 1);
  baseDate.setUTCHours(0, 0, 0, 0);

  // Calculate the offset in milliseconds from the custom epoch
  const offsetDate = new Date(baseDate.valueOf() + 864e5 * (dteNumber - 47117));

  // Create the final local Date with midnight time
  const resultDate = new Date();
  resultDate.setFullYear(offsetDate.getUTCFullYear(), offsetDate.getUTCMonth(), offsetDate.getUTCDate());
  resultDate.setHours(0, 0, 0, 0);

  return resultDate;
}

/**
 * Converts a JavaScript Date object into a 'dte' number (days since 1840-12-31).
 * @param dateObj - A JavaScript Date object
 * @returns The number of days since 1840-12-31
 */
export function date2dte(dateObj: Date): number {
  const utcDate = new Date(); // used to hold the target date at UTC midnight
  utcDate.setUTCFullYear(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  utcDate.setUTCHours(0, 0, 0, 0);

  const baseDateEpoch = new Date(); // holds the Unix epoch at midnight
  baseDateEpoch.setUTCFullYear(1970, 0, 1);
  baseDateEpoch.setUTCHours(0, 0, 0, 0);

  // Compute the difference in days from the custom epoch, then add 47117
  return (utcDate.valueOf() - baseDateEpoch.valueOf()) / 864e5 + 47117;
}




function test() {
    logger.debug(dte2date(18600))
    logger.debug(date2dte(new Date()))
}


if (import.meta.main) {
    test()
}




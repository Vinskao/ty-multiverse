export interface EmploymentPeriod {
  title: string;
  period: string;
  durationMonths?: number;
}

function monthIndex(value: string, now: Date): number {
  if (value.trim().toLowerCase() === 'present') {
    return now.getFullYear() * 12 + now.getMonth();
  }
  const match = /^(\d{4})\/(\d{1,2})$/.exec(value.trim());
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
    throw new Error(`Invalid employment month: ${value}`);
  }
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

export function experienceMonths(jobs: readonly EmploymentPeriod[], now = new Date()): number {
  const ranges = jobs.map(job => {
    const [start, end] = job.period.split('~');
    const firstMonth = monthIndex(start, now);
    const lastMonth = monthIndex(end, now);
    // Month-only periods omit the day of departure. A user-confirmed duration
    // resolves that ambiguity without changing every job's endpoint convention.
    const duration = job.durationMonths;
    if (duration !== undefined && (!Number.isInteger(duration) || duration < 0 || duration > lastMonth - firstMonth + 1)) {
      throw new Error(`Invalid confirmed duration: ${job.title}`);
    }
    return [firstMonth, duration === undefined ? lastMonth : firstMonth + duration] as [number, number];
  }).filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let current: [number, number] | undefined;
  for (const range of ranges) {
    if (current && range[0] <= current[1]) current[1] = Math.max(current[1], range[1]);
    else {
      if (current) total += current[1] - current[0];
      current = range;
    }
  }
  return total + (current ? current[1] - current[0] : 0);
}

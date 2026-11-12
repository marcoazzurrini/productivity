import { addDays, parseLocalDateTime, startOfWeek } from "@productivity/gtd";
import type {
  CaptureSource,
  Context,
  Energy,
  Heading,
  LocalDate,
  LocalDateTime,
  TaskList,
} from "@productivity/gtd";

/** Contexts every new database starts with. The user can work without others. */
export const defaultContexts: readonly Context[] = [
  { color: "blue", id: "computer", name: "@Computer" },
  { color: "green", id: "calls", name: "@Calls" },
  { color: "orange", id: "errands", name: "@Errands" },
  { color: "purple", id: "home", name: "@Home" },
  { color: "gray", id: "office", name: "@Office" },
];

export const defaultAreas: readonly { id: string; name: string }[] = [
  { id: "work", name: "Work" },
  { id: "personal", name: "Personal" },
];

export interface SeedProject {
  id: string;
  name: string;
  areaId: string;
  outcome: string;
  notes?: string;
  deadline: LocalDate | null;
}

export interface SeedTask {
  title: string;
  list: TaskList;
  source?: CaptureSource;
  projectId?: string;
  headingId?: string;
  contextId?: string;
  minutes?: number;
  energy?: Energy;
  startOn?: LocalDate;
  deadline?: LocalDate;
  starred?: boolean;
  waitingOn?: string;
  followUpOn?: LocalDate;
  notes?: string;
  block?: { start: string; end: string };
  completedAt?: LocalDateTime;
}

/**
 * A sample calendar. Each has its own color, so the week shows meetings,
 * focus time and personal plans apart, as the design does.
 */
export interface SeedCalendar {
  id: string;
  name: string;
  /** A CSS hex color. */
  color: string;
}

/** An event in its stored form. */
export interface SeedEvent {
  /** One of the sample calendars. */
  calendarId: string;
  title: string;
  allDay: boolean;
  /** A UTC instant, or for all-day events a day. */
  start: string;
  /** Exclusive, in the same format as start. */
  end: string;
}

export interface SampleData {
  projects: SeedProject[];
  /** In the order each project shows them. */
  headings: Heading[];
  tasks: SeedTask[];
  /** Kept on this Mac, beside the built-in calendar new events go on. */
  calendars: SeedCalendar[];
  events: SeedEvent[];
}

/**
 * Example content matching the design, dated around `today` so the app looks
 * alive on first launch. Only used when the caller asks for sample data.
 */
export const sampleData = (today: LocalDate): SampleData => {
  const day = (offset: number): LocalDate => addDays(today, offset);
  const monday = startOfWeek(today);

  const at = (weekday: number, time: string): string =>
    parseLocalDateTime(`${addDays(monday, weekday)}T${time}`).toISOString();

  /** Makes timed events on one of the sample calendars. */
  const timedOn =
    (calendarId: string) =>
    (weekday: number, from: string, until: string, title: string) => ({
      allDay: false,
      calendarId,
      end: at(weekday, until),
      start: at(weekday, from),
      title,
    });

  const meeting = timedOn("sample-work");
  const focus = timedOn("sample-focus");
  const personal = timedOn("sample-personal");

  return {
    // The tag palette's blue, purple, green and pink.
    calendars: [
      { color: "#337EA9", id: "sample-work", name: "Work" },
      { color: "#9065B0", id: "sample-focus", name: "Focus" },
      { color: "#448361", id: "sample-personal", name: "Personal" },
      { color: "#C14C8A", id: "sample-birthdays", name: "Birthdays" },
    ],
    events: [
      ...[0, 1, 2, 3, 4].map((weekday) =>
        meeting(weekday, "09:00", "09:30", "Team standup")
      ),
      {
        allDay: true,
        calendarId: "sample-focus",
        end: addDays(monday, 5),
        start: monday,
        title: "Q4 planning week",
      },
      {
        allDay: true,
        calendarId: "sample-birthdays",
        end: addDays(monday, 6),
        start: addDays(monday, 5),
        title: "Eve's birthday",
      },
      meeting(0, "11:00", "12:00", "Design review"),
      focus(0, "14:00", "16:00", "Deep work: roadmap"),
      personal(0, "19:00", "20:00", "Gym"),
      meeting(1, "10:00", "10:30", "1:1 with Olivia"),
      meeting(1, "15:00", "16:00", "Eng sync"),
      focus(2, "10:00", "12:00", "Writing: Q4 goals"),
      meeting(2, "13:00", "14:00", "Product review"),
      personal(2, "16:00", "17:00", "Dentist"),
      meeting(3, "10:00", "11:00", "Design Weekly"),
      meeting(3, "12:00", "13:00", "Eng Kickoff"),
      personal(3, "13:00", "14:00", "Lunch with Diane"),
      focus(3, "14:00", "15:30", "Deep work: Q4 budget"),
      meeting(3, "16:00", "17:00", "Product Updates"),
      personal(3, "19:00", "20:00", "Gym"),
      meeting(4, "10:00", "10:30", "1:1 with James"),
      personal(4, "12:30", "13:30", "Team lunch"),
      personal(4, "18:00", "19:30", "Team drinks"),
      personal(5, "10:00", "11:00", "Farmers market"),
      personal(5, "19:30", "21:30", "Dinner with Eve"),
      personal(6, "08:00", "09:30", "Long run"),
    ],
    headings: [
      {
        id: "slides-and-notes",
        projectId: "prepare-presentation",
        title: "Slides and notes",
      },
      {
        id: "preparation",
        projectId: "prepare-presentation",
        title: "Preparation",
      },
    ],
    projects: [
      {
        areaId: "work",
        deadline: day(14),
        id: "prepare-presentation",
        name: "Prepare Presentation",
        notes:
          "Keep the talk and slides simple: what are the three things about this that everyone should remember?",
        outcome:
          "The team leaves knowing the three key takeaways, and the deck is shared in Drive.",
      },
      {
        areaId: "work",
        deadline: day(7),
        id: "onboard-james",
        name: "Onboard James",
        outcome: "James has a working laptop, access and a first task.",
      },
      {
        areaId: "work",
        deadline: day(21),
        id: "q4-planning",
        name: "Q4 Planning",
        outcome: "Goals and budget for Q4 agreed with the team.",
      },
      {
        areaId: "personal",
        deadline: null,
        id: "vacation-in-rome",
        name: "Vacation in Rome",
        outcome: "Flights, hotel and the first two days planned.",
      },
      {
        areaId: "personal",
        deadline: null,
        id: "buy-a-new-car",
        name: "Buy a New Car",
        outcome: "A new car parked outside, within budget.",
      },
    ],
    tasks: [
      { list: "inbox", source: "mail", title: "Book flights for Rome trip" },
      { list: "inbox", title: "Call dentist about cleaning" },
      {
        list: "inbox",
        source: "voice",
        title: "Idea: podcast about remote teams",
      },
      { list: "inbox", title: "Renew passport before April" },
      {
        list: "inbox",
        source: "chat",
        title: "Ask Eric to check the budget numbers",
      },
      {
        list: "inbox",
        source: "web",
        title: "Article: how the two-minute rule works",
      },
      { list: "inbox", source: "mail", title: "Receipt: conference hotel" },

      {
        block: { end: at(3, "12:00"), start: at(3, "11:00") },
        contextId: "computer",
        energy: "high",
        headingId: "slides-and-notes",
        list: "next",
        minutes: 60,
        notes: "Start from last quarter's deck.",
        projectId: "prepare-presentation",
        title: "Draft slide outline",
      },
      {
        contextId: "computer",
        headingId: "slides-and-notes",
        list: "next",
        projectId: "prepare-presentation",
        title: "Simplify slide layouts",
      },
      {
        contextId: "computer",
        list: "next",
        minutes: 15,
        projectId: "onboard-james",
        title: "Reply to James about laptop setup",
      },
      {
        contextId: "computer",
        list: "next",
        minutes: 30,
        projectId: "vacation-in-rome",
        title: "Compare fares for April 12–19",
      },
      {
        contextId: "computer",
        deadline: day(-2),
        list: "next",
        minutes: 15,
        title: "Send invoice to Acme",
      },
      {
        contextId: "computer",
        energy: "high",
        list: "next",
        minutes: 90,
        projectId: "q4-planning",
        starred: true,
        title: "Write first draft of Q4 goals",
      },
      {
        block: { end: at(3, "18:00"), start: at(3, "17:30") },
        contextId: "calls",
        headingId: "preparation",
        list: "next",
        minutes: 15,
        projectId: "prepare-presentation",
        title: "Call Diane about venue",
      },
      {
        contextId: "office",
        headingId: "preparation",
        list: "next",
        minutes: 60,
        projectId: "prepare-presentation",
        title: "Time a full rehearsal",
      },
      {
        contextId: "office",
        headingId: "preparation",
        list: "next",
        projectId: "prepare-presentation",
        title: "Do a practice run with Eric",
      },
      // Ticked today, so they stay in place on the project's page.
      {
        completedAt: `${today}T09:10`,
        contextId: "computer",
        headingId: "preparation",
        list: "next",
        projectId: "prepare-presentation",
        title: "Revise introduction",
      },
      {
        completedAt: `${today}T09:25`,
        contextId: "computer",
        headingId: "preparation",
        list: "next",
        projectId: "prepare-presentation",
        title: "Email John for presentation tips",
      },
      // Ticked days ago: behind "Show completed to-dos".
      ...[
        "Agree on the talk's goal with Olivia",
        "Reserve the auditorium",
        "Collect last quarter's numbers",
        "Send the invitation to the team",
      ].map((title) => ({
        completedAt: `${day(-3)}T16:30`,
        list: "next" as const,
        projectId: "prepare-presentation",
        title,
      })),
      {
        contextId: "calls",
        list: "next",
        minutes: 15,
        projectId: "buy-a-new-car",
        title: "Call the dealer about a test drive",
      },
      {
        contextId: "office",
        headingId: "slides-and-notes",
        list: "next",
        minutes: 30,
        projectId: "prepare-presentation",
        starred: true,
        title: "Review quarterly data with Olivia",
      },
      {
        contextId: "office",
        list: "next",
        minutes: 15,
        projectId: "onboard-james",
        title: "Set up James's desk and badge",
      },
      {
        block: { end: at(5, "12:00"), start: at(5, "11:30") },
        contextId: "errands",
        energy: "low",
        list: "next",
        minutes: 15,
        title: "Pick up dry cleaning",
      },
      {
        contextId: "errands",
        energy: "low",
        list: "next",
        minutes: 15,
        projectId: "vacation-in-rome",
        title: "Buy a travel adapter",
      },
      {
        contextId: "errands",
        deadline: day(21),
        headingId: "slides-and-notes",
        list: "next",
        minutes: 15,
        projectId: "prepare-presentation",
        title: "Print handouts for attendees",
      },
      {
        block: { end: at(6, "17:00"), start: at(6, "16:00") },
        contextId: "home",
        energy: "low",
        list: "next",
        minutes: 30,
        notes: "Chapter 4 covers collecting.",
        title: "Read chapter 4 of Getting Things Done",
      },
      {
        contextId: "home",
        energy: "low",
        list: "next",
        minutes: 30,
        title: "Sort the tax papers",
      },
      {
        contextId: "calls",
        list: "next",
        minutes: 15,
        startOn: day(3),
        title: "Book restaurant for Eve's birthday",
      },
      {
        contextId: "computer",
        deadline: day(10),
        list: "next",
        minutes: 30,
        startOn: day(5),
        title: "Renew car insurance",
      },

      {
        followUpOn: day(-2),
        list: "waiting",
        projectId: "q4-planning",
        title: "Final budget numbers",
        waitingOn: "Eric Chen",
      },
      {
        followUpOn: day(-1),
        list: "waiting",
        title: "Replacement laptop charger",
        waitingOn: "Apple Store",
      },
      {
        followUpOn: day(1),
        list: "waiting",
        projectId: "onboard-james",
        title: "Signed onboarding documents",
        waitingOn: "James Park",
      },
      {
        followUpOn: day(4),
        list: "waiting",
        projectId: "prepare-presentation",
        title: "Venue confirmation for Nov 14",
        waitingOn: "Diane Moss",
      },
      {
        followUpOn: day(5),
        list: "waiting",
        projectId: "prepare-presentation",
        title: "Quarterly data export",
        waitingOn: "Olivia Grant",
      },

      { list: "someday", title: "Learn to cook fresh pasta" },
      { list: "someday", title: "Build a standing desk" },
      { list: "someday", title: "Visit Japan in spring" },
      { list: "someday", title: "Run a half marathon" },
    ],
  };
};

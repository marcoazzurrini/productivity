import { addDays, startOfWeek } from "@productivity/gtd";
import type {
  CalendarEventKind,
  CaptureSource,
  Context,
  Energy,
  LocalDate,
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
  deadline: LocalDate | null;
}

export interface SeedTask {
  title: string;
  list: TaskList;
  source?: CaptureSource;
  projectId?: string;
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
}

export interface SeedEvent {
  title: string;
  kind: CalendarEventKind;
  start: string;
  end: string;
  allDay?: boolean;
}

export interface SampleData {
  projects: SeedProject[];
  tasks: SeedTask[];
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
    `${addDays(monday, weekday)}T${time}`;

  return {
    events: [
      ...[0, 1, 2, 3, 4].map((weekday) => ({
        end: at(weekday, "09:30"),
        kind: "meeting" as const,
        start: at(weekday, "09:00"),
        title: "Team standup",
      })),
      {
        allDay: true,
        end: at(4, "23:59"),
        kind: "focus",
        start: at(0, "00:00"),
        title: "Q4 planning week",
      },
      {
        allDay: true,
        end: at(5, "23:59"),
        kind: "personal",
        start: at(5, "00:00"),
        title: "Eve's birthday",
      },
      {
        end: at(0, "12:00"),
        kind: "meeting",
        start: at(0, "11:00"),
        title: "Design review",
      },
      {
        end: at(0, "16:00"),
        kind: "focus",
        start: at(0, "14:00"),
        title: "Deep work: roadmap",
      },
      {
        end: at(0, "20:00"),
        kind: "personal",
        start: at(0, "19:00"),
        title: "Gym",
      },
      {
        end: at(1, "10:30"),
        kind: "meeting",
        start: at(1, "10:00"),
        title: "1:1 with Olivia",
      },
      {
        end: at(1, "16:00"),
        kind: "meeting",
        start: at(1, "15:00"),
        title: "Eng sync",
      },
      {
        end: at(2, "12:00"),
        kind: "focus",
        start: at(2, "10:00"),
        title: "Writing: Q4 goals",
      },
      {
        end: at(2, "14:00"),
        kind: "meeting",
        start: at(2, "13:00"),
        title: "Product review",
      },
      {
        end: at(2, "17:00"),
        kind: "personal",
        start: at(2, "16:00"),
        title: "Dentist",
      },
      {
        end: at(3, "11:00"),
        kind: "meeting",
        start: at(3, "10:00"),
        title: "Design Weekly",
      },
      {
        end: at(3, "13:00"),
        kind: "meeting",
        start: at(3, "12:00"),
        title: "Eng Kickoff",
      },
      {
        end: at(3, "14:00"),
        kind: "personal",
        start: at(3, "13:00"),
        title: "Lunch with Diane",
      },
      {
        end: at(3, "15:30"),
        kind: "focus",
        start: at(3, "14:00"),
        title: "Deep work: Q4 budget",
      },
      {
        end: at(3, "17:00"),
        kind: "meeting",
        start: at(3, "16:00"),
        title: "Product Updates",
      },
      {
        end: at(3, "20:00"),
        kind: "personal",
        start: at(3, "19:00"),
        title: "Gym",
      },
      {
        end: at(4, "10:30"),
        kind: "meeting",
        start: at(4, "10:00"),
        title: "1:1 with James",
      },
      {
        end: at(4, "13:30"),
        kind: "personal",
        start: at(4, "12:30"),
        title: "Team lunch",
      },
      {
        end: at(4, "19:30"),
        kind: "personal",
        start: at(4, "18:00"),
        title: "Team drinks",
      },
      {
        end: at(5, "11:00"),
        kind: "personal",
        start: at(5, "10:00"),
        title: "Farmers market",
      },
      {
        end: at(5, "21:30"),
        kind: "personal",
        start: at(5, "19:30"),
        title: "Dinner with Eve",
      },
      {
        end: at(6, "09:30"),
        kind: "personal",
        start: at(6, "08:00"),
        title: "Long run",
      },
    ],
    projects: [
      {
        areaId: "work",
        deadline: day(14),
        id: "prepare-presentation",
        name: "Prepare Presentation",
        outcome: "Slides approved by Olivia and rehearsed once end to end.",
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
        list: "next",
        minutes: 60,
        notes: "Start from last quarter's deck.",
        projectId: "prepare-presentation",
        title: "Draft slide outline",
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
        list: "next",
        minutes: 15,
        projectId: "prepare-presentation",
        title: "Call Diane about venue",
      },
      {
        contextId: "calls",
        list: "next",
        minutes: 15,
        projectId: "buy-a-new-car",
        title: "Call the dealer about a test drive",
      },
      {
        contextId: "office",
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

import type { PersonalStats } from "./statistics";

export type AchievementIcon = "film" | "clapperboard" | "flame" | "calendar" | "clock" | "folders";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  unlocked: boolean;
  icon: AchievementIcon;
}

export function calculateAchievements(stats: PersonalStats, collectionCount: number): Achievement[] {
  const milestones: Omit<Achievement, "unlocked">[] = [
    {
      id: "first-movie",
      title: "Primera función",
      description: "Registra tu primera película vista.",
      progress: stats.uniqueMoviesWatched,
      target: 1,
      unit: "película",
      icon: "film"
    },
    {
      id: "five-movies",
      title: "Cinco historias",
      description: "Completa cinco películas diferentes.",
      progress: stats.uniqueMoviesWatched,
      target: 5,
      unit: "películas",
      icon: "clapperboard"
    },
    {
      id: "five-viewings",
      title: "De vuelta a la sala",
      description: "Registra cinco experiencias de visionado.",
      progress: stats.totalViewings,
      target: 5,
      unit: "visionados",
      icon: "film"
    },
    {
      id: "three-day-streak",
      title: "Racha en marcha",
      description: "Disfruta del cine durante tres días consecutivos.",
      progress: stats.longestStreak,
      target: 3,
      unit: "días",
      icon: "flame"
    },
    {
      id: "seven-active-days",
      title: "Costumbre cinéfila",
      description: "Registra actividad en siete días diferentes.",
      progress: stats.activeDays,
      target: 7,
      unit: "días",
      icon: "calendar"
    },
    {
      id: "ten-hours",
      title: "Diez horas de cine",
      description: "Acumula diez horas de películas vistas.",
      progress: Math.floor(stats.watchedMinutes / 60),
      target: 10,
      unit: "horas",
      icon: "clock"
    },
    {
      id: "three-collections",
      title: "Curador de cine",
      description: "Crea tres colecciones personales.",
      progress: collectionCount,
      target: 3,
      unit: "colecciones",
      icon: "folders"
    }
  ];

  return milestones.map((item) => ({
    ...item,
    progress: Math.max(0, item.progress),
    unlocked: item.progress >= item.target
  }));
}

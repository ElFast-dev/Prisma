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
      id: "twenty-movies",
      title: "Veinte historias",
      description: "Explora veinte películas diferentes.",
      progress: stats.uniqueMoviesWatched,
      target: 20,
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
      id: "twenty-viewings",
      title: "La sala es tuya",
      description: "Guarda veinte experiencias cinematográficas.",
      progress: stats.totalViewings,
      target: 20,
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
      id: "seven-day-streak",
      title: "Semana de cine",
      description: "Mantén una racha de siete días consecutivos.",
      progress: stats.longestStreak,
      target: 7,
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
      id: "thirty-active-days",
      title: "Un mes entre historias",
      description: "Alcanza treinta días con actividad cinematográfica.",
      progress: stats.activeDays,
      target: 30,
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
      id: "fifty-hours",
      title: "Cincuenta horas de historias",
      description: "Dedica cincuenta horas a tus películas.",
      progress: Math.floor(stats.watchedMinutes / 60),
      target: 50,
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
    },
    {
      id: "five-collections",
      title: "Archivista",
      description: "Reúne tus selecciones en cinco colecciones.",
      progress: collectionCount,
      target: 5,
      unit: "colecciones",
      icon: "folders"
    }
  ];

  return milestones.map((item) => {
    const progress = Math.max(0, item.progress);
    return {
      ...item,
      progress,
      unlocked: progress >= item.target
    };
  });
}

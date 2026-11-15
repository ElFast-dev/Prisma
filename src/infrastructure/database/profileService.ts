import type { LocalProfile } from "../../domain/types";
import { prismaDb } from "./database";

export type LocalProfileDraft = Pick<LocalProfile, "name" | "description" | "personalPhrase" | "avatarDataUrl">;

export async function getLocalProfile(): Promise<LocalProfile | undefined> {
  return prismaDb.profile.get("local");
}

export async function saveLocalProfile(draft: LocalProfileDraft): Promise<LocalProfile> {
  const name = draft.name?.trim();
  const description = draft.description?.trim();
  const personalPhrase = draft.personalPhrase?.trim();

  if (!name) throw new Error("Escribe el nombre que quieres mostrar en tu perfil.");
  if (name.length > 40) throw new Error("El nombre no puede superar los 40 caracteres.");
  if ((description?.length ?? 0) > 160) throw new Error("La descripción no puede superar los 160 caracteres.");
  if ((personalPhrase?.length ?? 0) > 100) throw new Error("Tu frase personal no puede superar los 100 caracteres.");

  const profile: LocalProfile = {
    id: "local",
    name,
    description: description || undefined,
    personalPhrase: personalPhrase || undefined,
    avatarDataUrl: draft.avatarDataUrl || undefined,
    updatedAt: new Date().toISOString()
  };

  await prismaDb.profile.put(profile);
  return profile;
}

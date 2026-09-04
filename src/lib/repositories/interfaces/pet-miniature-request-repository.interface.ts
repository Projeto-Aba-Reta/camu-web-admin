import type { PetMiniatureRequest } from "@/types/pet-miniature";

export interface IPetMiniatureRequestRepository {
  // Volume baixo (uma linha por pet encomendado) — sem paginação, mesmo
  // padrão de listAll() dos outros catálogos pequenos do sistema.
  listAll(): Promise<PetMiniatureRequest[]>;
}

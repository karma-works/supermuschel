// Serialized types for renderer — tRPC serializes Date to string across IPC
import type { Workspace } from "@supermuschel/shared";

export type SerializedWorkspace = Omit<Workspace, "createdAt" | "updatedAt"> & {
  createdAt: string | null;
  updatedAt: string | null;
};

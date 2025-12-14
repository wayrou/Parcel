export type NoteColor =
  | "paper"
  | "yellow"
  | "mint"
  | "lavender"
  | "salmon"
  | "sky";

export type Note = {
  id: string;
  title: string;
  body: string;
  folderId: string | null;
  pinned: boolean;
  color: NoteColor;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
};

export type Folder = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type ParcelData = {
  version: 1;
  notes: Note[];
  folders: Folder[];
};

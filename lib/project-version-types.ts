export type TopicDirectionVersionPayload = {
  type: "topic-direction";
  selectedId: string;
  customNote: string;
};

export type OutlineVersionPayload = {
  type: "outline";
  selectedId: string;
  customTitle: string;
  customAbstractNote: string;
};

export type ChapterVersionPayload = {
  type: "chapter";
  chapterId: string;
  paragraphs: string[];
};

export type FullTextVersionPayload = {
  type: "fulltext";
  generatedPreview: string;
};

export type ProjectVersionPayload =
  | TopicDirectionVersionPayload
  | OutlineVersionPayload
  | ChapterVersionPayload
  | FullTextVersionPayload;

export type ProjectVersionRecord<TPayload extends ProjectVersionPayload = ProjectVersionPayload> = {
  id: string;
  projectId: string;
  key: string;
  title: string;
  summary: string;
  fingerprint: string;
  createdAt: string;
  payload: TPayload;
};

export type CreateProjectVersionInput<TPayload extends ProjectVersionPayload = ProjectVersionPayload> = {
  key: string;
  title: string;
  summary: string;
  fingerprint: string;
  payload: TPayload;
};

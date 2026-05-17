export type InvitationEventType =
  | 'baby'
  | 'wedding'
  | 'graduation'
  | 'comingOfAge'
  | 'housewarming'
  | 'custom';

export type InvitationThemeId =
  | 'babyDream'
  | 'roseWedding'
  | 'goldGraduate'
  | 'midnightAge'
  | 'freshHome'
  | 'customGlow';

export type RsvpStatus = 'yes' | 'maybe' | 'no';

export interface InvitationScheduleItem {
  time: string;
  title: string;
  note: string;
}

export interface OnlineInvitation {
  id?: string;
  eventType: InvitationEventType;
  themeId: InvitationThemeId;
  title: string;
  subtitle: string;
  hostNames: string;
  honoredName: string;
  date: string;
  time: string;
  locationName: string;
  address: string;
  mapUrl: string;
  message: string;
  dressCode: string;
  phone: string;
  zalo: string;
  coverImage: string;
  musicUrl: string;
  gallery: string[];
  schedule: InvitationScheduleItem[];
  rsvpEnabled: boolean;
  createdAt?: number;
  updatedAt?: number;
  userEmail?: string;
  userId?: string;
}

export interface InvitationRsvp {
  id?: string;
  guestName: string;
  phone: string;
  status: RsvpStatus;
  guestCount: number;
  wish: string;
  createdAt: number;
}

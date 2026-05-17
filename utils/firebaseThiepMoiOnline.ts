import { database } from './firebaseConfig';
import { ref, push, set, get, update } from 'firebase/database';
import { InvitationRsvp, OnlineInvitation } from '../types/invitationTypes';

const INVITATIONS_REF = 'online-invitations';

const createShortId = (pushKey: string): string => pushKey.slice(-8);

const findFullKeyFromShortId = async (shortId: string): Promise<string | null> => {
  const invitationsRef = ref(database, INVITATIONS_REF);
  const snapshot = await get(invitationsRef);
  if (!snapshot.exists()) return null;

  const data = snapshot.val();
  return Object.keys(data).find((key) => key.endsWith(shortId)) || null;
};

export const saveOnlineInvitation = async (
  invitation: OnlineInvitation,
  userId?: string,
  userEmail?: string
): Promise<string | null> => {
  try {
    const invitationsRef = ref(database, INVITATIONS_REF);
    const newRef = push(invitationsRef);
    const pushKey = newRef.key;
    if (!pushKey) return null;

    const now = Date.now();
    await set(newRef, {
      invitation: {
        ...invitation,
        userId: userId || invitation.userId || null,
        userEmail: userEmail || invitation.userEmail || null,
        createdAt: now,
        updatedAt: now
      },
      createdAt: now,
      updatedAt: now,
      userId: userId || null,
      userEmail: userEmail || null
    });

    return createShortId(pushKey);
  } catch (error) {
    console.error('[OnlineInvitation] Error saving invitation:', error);
    return null;
  }
};

export const updateOnlineInvitation = async (
  shortId: string,
  invitation: OnlineInvitation
): Promise<boolean> => {
  try {
    const fullKey = await findFullKeyFromShortId(shortId);
    if (!fullKey) return false;
    const now = Date.now();
    await update(ref(database, `${INVITATIONS_REF}/${fullKey}`), {
      invitation: {
        ...invitation,
        updatedAt: now
      },
      updatedAt: now
    });
    return true;
  } catch (error) {
    console.error('[OnlineInvitation] Error updating invitation:', error);
    return false;
  }
};

export const getOnlineInvitation = async (shortId: string): Promise<OnlineInvitation | null> => {
  try {
    const fullKey = await findFullKeyFromShortId(shortId);
    if (!fullKey) return null;
    const snapshot = await get(ref(database, `${INVITATIONS_REF}/${fullKey}/invitation`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('[OnlineInvitation] Error getting invitation:', error);
    return null;
  }
};

export const getUserOnlineInvitations = async (userEmail: string): Promise<Array<OnlineInvitation & { shortId: string; rsvpCount: number }>> => {
  try {
    const invitationsRef = ref(database, INVITATIONS_REF);
    const snapshot = await get(invitationsRef);
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    return Object.keys(data)
      .map((key) => ({ key, item: data[key] }))
      .filter(({ item }) => (item.userEmail || item.invitation?.userEmail || '').toLowerCase() === userEmail.toLowerCase())
      .map(({ key, item }) => ({
        ...item.invitation,
        shortId: createShortId(key),
        rsvpCount: item.rsvps ? Object.keys(item.rsvps).length : 0
      }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (error) {
    console.error('[OnlineInvitation] Error getting user invitations:', error);
    return [];
  }
};

export const saveOnlineInvitationRsvp = async (
  shortId: string,
  rsvp: Omit<InvitationRsvp, 'createdAt'>
): Promise<boolean> => {
  try {
    const fullKey = await findFullKeyFromShortId(shortId);
    if (!fullKey) return false;

    const encodedName = btoa(encodeURIComponent(`${rsvp.guestName.trim().toLowerCase()}-${rsvp.phone.trim()}`));
    await set(ref(database, `${INVITATIONS_REF}/${fullKey}/rsvps/${encodedName}`), {
      ...rsvp,
      createdAt: Date.now()
    });
    return true;
  } catch (error) {
    console.error('[OnlineInvitation] Error saving RSVP:', error);
    return false;
  }
};

export const getOnlineInvitationRsvps = async (shortId: string): Promise<InvitationRsvp[]> => {
  try {
    const fullKey = await findFullKeyFromShortId(shortId);
    if (!fullKey) return [];
    const snapshot = await get(ref(database, `${INVITATIONS_REF}/${fullKey}/rsvps`));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    return Object.keys(data)
      .map((key) => ({
        id: key,
        ...data[key]
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.error('[OnlineInvitation] Error getting RSVPs:', error);
    return [];
  }
};

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'
import { useSound } from '../hooks/useSound'
import { supabase } from '../lib/supabase'
import { mono } from '../lib/typo'
import { tr } from '../i18n'

function genCode(): string {
  const adj = ['LOUP', 'CYGNE', 'CRABE', 'OURS', 'VACHE', 'TIGRE', 'AIGLE', 'SINGE', 'VIPÈRE', 'LAPIN', 'RENARD', 'HIBOU']
  const n = Math.floor(Math.random() * 90) + 10
  return `${adj[Math.floor(Math.random() * adj.length)]}-${n}`
}

type PublicRoom = {
  code: string
  mode: string
  structure_id: string
  nb_joueurs: number
  player_count: number
}

const MODE_LABEL: Record<string, string> = { ecrit: tr('ÉCRIT', 'WRITTEN'), dessin: tr('DESSINÉ', 'DRAWN') }
const STRUCT_SHORT: Record<string, string> = {
  'phrase-simple': '3 fragments',
  'phrase-etoffee': '5 fragments',
  'vers-libre': tr('libre', 'free'),
}

export default function Online() {
  const navigate = useNavigate()
  const seance = useReve()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'

  const { user, profile, loading, signInAnonymously, signOut } = useAuth()
  const { jouer } = useSound()

  const [pseudo, setPseudo] = useState('')
  const [joinError2, setJoinError2] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [liveConnected, setLiveConnected] = useState(false)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchPublicRooms = useCallback(async () => {
    setLoadingRooms(true)
    try {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('code, mode, structure_id, nb_joueurs')
        .eq('status', 'waiting')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10)
      if (!rooms) { setPublicRooms([]); return }
      const withCounts = await Promise.all(rooms.map(async (r) => {
        const { count } = await supabase
          .from('room_players')
          .select('*', { count: 'exact', head: true })
          .eq('room_code', r.code)
        return { ...r, player_count: count ?? 0 }
      }))
      setPublicRooms(withCounts)
    } finally {
      setLoadingRooms(false)
    }
  }, [])

  // Souscription Realtime : la liste se met à jour seule dès qu'un salon
  // apparaît, se remplit ou passe en jeu — plus besoin du bouton ↺.
  useEffect(() => {
    if (!user || !profile) return
    fetchPublicRooms()

    const ch = supabase
      .channel('lobby-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'is_public=eq.true' }, () => {
        fetchPublicRooms()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, () => {
        fetchPublicRooms()
      })
      .subscribe(status => {
        setLiveConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = ch
    return () => {
      ch.unsubscribe()
      setLiveConnected(false)
    }
  }, [user, profile, fetchPublicRooms])

  async function handleAnonymousJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!pseudo.trim()) return
    setSigningIn(true)
    setJoinError2(null)
    const err = await signInAnonymously(pseudo.trim())
    setSigningIn(false)
    if (err) setJoinError2(err)
  }

  // Rejoindre en un clic : prend la première place disponible, ou crée un salon.
  async function handleQuickJoin() {
    if (!user || !profile) return
    jouer('clic')
    setJoining(true)
    setJoinError(null)
    try {
      const dispo = publicRooms.find(r => r.player_count < r.nb_joueurs)
      if (dispo) {
        navigate(`/salon/${dispo.code}`)
        return
      }
      // Aucune place disponible : créer un salon public et attendre des joueurs.
      const code = genCode()
      const { error } = await supabase.from('rooms').insert({
        code, host_id: user.id, mode: 'ecrit',
        structure_id: 'phrase-simple', nb_joueurs: 3,
        status: 'waiting', is_public: true,
      })
      if (error) throw error
      navigate(`/salon/${code}`)
    } catch (err: any) {
      setJoinError(err?.message ?? tr('Impossible de rejoindre — réessaie.', 'Could not join — try again.'))
    } finally {
      setJoining(false)
    }
  }

  async function handleCreate() {
    if (!user || !profile) return
    jouer('clic')
    setCreating(true)
    setCreateError(null)
    try {
      const code = genCode()
      const { error } = await supabase.from('rooms').insert({
        code, host_id: user.id, mode: 'ecrit',
        structure_id: 'phrase-simple', nb_joueurs: 3,
        status: 'waiting', is_public: true,
      })
      if (error) throw error
      navigate(`/salon/${code}`)
    } catch (err: any) {
      console.error('Erreur création salon:', err)
      setCreateError(err?.message ?? tr('Erreur lors de la création du salon.', 'Error while creating the room.'))
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code || !user || !profile) return
    jouer('clic')
    setJoining(true)
    setJoinError(null)
    try {
      const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single()
      if (!room) { setJoinError(tr('Salon introuvable — vérifie le code.', 'Room not found — check the code.')); setJoining(false); return }
      if (room.status !== 'waiting') { setJoinError(tr('Cette partie a déjà commencé.', 'This game has already started.')); setJoining(false); return }
      navigate(`/salon/${code}`)
    } catch {
      setJoinError(tr('Impossible de rejoindre — réessaie.', 'Could not join — try again.'))
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        <span style={{ ...mono, fontSize: 13, color: accent, opacity: 0.8 }}>{tr('CHARGEMENT…', 'LOADING…')}</span>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="aide" />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          onClick={() => navigate('/')}
          style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← {tr('RETOUR', 'BACK')}
        </button>
        {user && (
          <button
            onClick={signOut}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {tr('DÉCONNEXION', 'SIGN OUT')}
          </button>
        )}
      </div>
      <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

      <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 28, marginBottom: 8 }}>
        {tr('— MODE EN LIGNE —', '— ONLINE MODE —')}
      </div>

      {/* ── NOT LOGGED IN ── */}
      {!user && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="font-fraunces font-black leading-tight"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre, marginBottom: 12 }}
          >
            {tr('Jouer à plusieurs.', 'Play together.')}
          </div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85, lineHeight: 1.65, marginBottom: 28 }}>
            {tr("Chaque joueur sur son propre appareil. Tu composes un cadavre exquis à plusieurs, chacun ignorant ce qu'ont écrit les autres. La révélation est collective.", 'Each player on their own device. You compose an exquisite corpse together, each unaware of what the others have written. The reveal is collective.')}
          </p>

          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            {tr('— TON NOM DE PLUME —', '— YOUR PEN NAME —')}
          </div>

          <form onSubmit={handleAnonymousJoin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              placeholder={tr("ex : L'Étranger, Séraphine, le Muet…", 'e.g. The Stranger, Seraphine, the Mute…')}
              aria-label={tr('Pseudonyme', 'Pen name')}
              maxLength={30}
              required
              autoFocus
              style={{
                fontFamily: "'Playfair Display', serif", fontSize: 18,
                color: encre, background: 'rgba(255,253,247,0.5)',
                border: 'none', borderLeft: `2px solid ${encre}`, padding: '10px 14px',
                borderRadius: '0 3px 3px 0',
                outline: 'none', caretColor: accent, width: '100%',
              }}
            />
            {joinError2 && (
              <p style={{ ...mono, fontSize: 13, color: '#b22c20', marginTop: -4 }}>{joinError2}</p>
            )}
            <button
              type="submit"
              disabled={signingIn || !pseudo.trim()}
              style={{ background: accent, color: btnText, ...mono, fontSize: 17, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.9em 1.8em', borderRadius: 3, border: 'none', cursor: signingIn ? 'wait' : 'pointer', opacity: signingIn || !pseudo.trim() ? 0.5 : 1 }}
            >
              {signingIn ? tr('CONNEXION…', 'SIGNING IN…') : tr('ENTRER DANS LE JEU →', 'ENTER THE GAME →')}
            </button>
          </form>
        </motion.div>
      )}

      {/* ── LOGGED IN BUT NO PROFILE ── */}
      {user && !profile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85, marginBottom: 20 }}>
            {tr('Connecté. Crée ton profil pour continuer.', 'Signed in. Create your profile to continue.')}
          </p>
          <button
            onClick={() => navigate('/profil')}
            style={{ background: accent, color: btnText, ...mono, fontSize: 17, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.85em 1.8em', borderRadius: 3, border: 'none', cursor: 'pointer' }}
          >
            {tr('CRÉER MON PROFIL', 'CREATE MY PROFILE')} →
          </button>
        </motion.div>
      )}

      {/* ── LOGGED IN WITH PROFILE ── */}
      {user && profile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Profil courant */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `0.5px solid ${encre}20` }}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.pseudo}
                style={{ width: 48, height: 48, borderRadius: 3, objectFit: 'cover', border: `1px solid ${accent}40` }}
              />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 3, background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 22, color: accent }}>
                  {profile.pseudo[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 21, letterSpacing: '-0.01em', color: encre }}>{profile.pseudo}</div>
              <button
                onClick={() => navigate('/profil')}
                style={{ ...mono, fontSize: 13, color: accent, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {tr('MODIFIER LE PROFIL', 'EDIT PROFILE')}
              </button>
            </div>
          </div>

          {/* ── REJOINDRE EN UN CLIC ── */}
          <div>
            <motion.button
              onClick={handleQuickJoin}
              disabled={joining}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                background: accent, color: btnText,
                ...mono, fontSize: 17, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '1em 1.8em', border: 'none', cursor: joining ? 'wait' : 'pointer',
                borderRadius: 3,
                opacity: joining ? 0.6 : 1,
              }}
            >
              {joining
                ? tr('RECHERCHE…', 'SEARCHING…')
                : publicRooms.some(r => r.player_count < r.nb_joueurs)
                  ? tr(
                      `REJOINDRE — ${publicRooms.filter(r => r.player_count < r.nb_joueurs).length} place${publicRooms.filter(r => r.player_count < r.nb_joueurs).length > 1 ? 's' : ''} libre${publicRooms.filter(r => r.player_count < r.nb_joueurs).length > 1 ? 's' : ''}`,
                      `JOIN — ${publicRooms.filter(r => r.player_count < r.nb_joueurs).length} open seat${publicRooms.filter(r => r.player_count < r.nb_joueurs).length > 1 ? 's' : ''}`
                    )
                  : tr('CRÉER UNE PARTIE', 'CREATE A GAME')}
            </motion.button>
            {joinError && (
              <p style={{ ...mono, fontSize: 13, color: '#b22c20', marginTop: 8 }}>{joinError}</p>
            )}
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.55, marginTop: 8, lineHeight: 1.5 }}>
              {publicRooms.some(r => r.player_count < r.nb_joueurs)
                ? tr('Tu rejoins la première partie disponible.', 'You join the first available game.')
                : tr("Aucune partie ouverte — un salon public est créé pour toi, d'autres pourront rejoindre.", 'No open game — a public room is created for you; others can join.')}
            </p>
          </div>

          {/* ── PARTIES OUVERTES (liste détaillée) ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em' }}>
                {tr('— PARTIES OUVERTES —', '— OPEN GAMES —')}
              </div>
              {/* Indicateur de connexion temps réel */}
              <motion.div
                animate={liveConnected ? { opacity: [1, 0.4, 1] } : { opacity: 0.25 }}
                transition={liveConnected ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: liveConnected ? '#4caf50' : encre,
                  flexShrink: 0,
                }}
                title={liveConnected ? tr('Mise à jour en direct', 'Live updates') : tr('Connexion…', 'Connecting…')}
              />
            </div>
            {loadingRooms && publicRooms.length === 0 ? (
              <p style={{ ...mono, fontSize: 13, color: encre, opacity: 0.5 }}>{tr('Recherche…', 'Searching…')}</p>
            ) : publicRooms.length === 0 ? (
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.65, lineHeight: 1.5 }}>
                {tr("Aucune partie ouverte pour l'instant.", 'No open games at the moment.')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {publicRooms.map((r) => {
                  const placesDispo = r.player_count < r.nb_joueurs
                  return (
                    <motion.button
                      key={r.code}
                      onClick={() => { jouer('clic'); navigate(`/salon/${r.code}`) }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: placesDispo ? `${accent}08` : `${encre}06`,
                        border: `1px solid ${placesDispo ? accent : encre}20`,
                        borderLeft: `3px solid ${placesDispo ? accent : `${encre}30`}`,
                        borderRadius: 3,
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        opacity: placesDispo ? 1 : 0.55,
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 24, lineHeight: 1, letterSpacing: '-0.01em', color: encre, marginBottom: 3 }}>
                          {r.code}
                        </div>
                        <div style={{ ...mono, fontSize: 13, color: accent, letterSpacing: '0.18em' }}>
                          {MODE_LABEL[r.mode] ?? r.mode} · {STRUCT_SHORT[r.structure_id] ?? r.structure_id}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ ...mono, fontSize: 13, color: placesDispo ? accent : encre, fontWeight: 700 }}>
                          {r.player_count}/{r.nb_joueurs}
                        </div>
                        <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.5 }}>
                          {placesDispo ? tr('REJOINDRE', 'JOIN') : tr('COMPLET', 'FULL')}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── NOUVELLE PARTIE — seulement quand des salons existent déjà ── */}
          {publicRooms.length > 0 && (
            <div>
              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
                {tr('— NOUVELLE PARTIE —', '— NEW GAME —')}
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85, marginBottom: 14, lineHeight: 1.5 }}>
                {tr("Crée un salon et partage le code, ou laisse-le public pour que d'autres rejoignent.", 'Create a room and share the code, or leave it public so others can join.')}
              </p>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{ background: 'transparent', color: encre, ...mono, fontSize: 17, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.9em 1.8em', border: `1px solid ${encre}40`, borderRadius: 3, cursor: creating ? 'wait' : 'pointer', opacity: creating ? 0.6 : 1, width: '100%' }}
              >
                {creating ? tr('CRÉATION…', 'CREATING…') : tr('CRÉER UN SALON', 'CREATE A ROOM')}
              </button>
              {createError && (
                <p style={{ ...mono, fontSize: 13, color: '#b22c20', marginTop: 8 }}>{createError}</p>
              )}
            </div>
          )}

          {/* ── REJOINDRE PAR CODE ── */}
          <div>
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
              {tr('— REJOINDRE PAR CODE —', '— JOIN BY CODE —')}
            </div>
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="LOUP-42"
                aria-label={tr('Code du salon', 'Room code')}
                maxLength={12}
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
                style={{
                  ...mono, fontSize: 17, textTransform: 'uppercase',
                  color: encre, background: `${encre}14`,
                  border: 'none',
                  borderLeft: `2px solid ${encre}`,
                  borderBottom: `1px solid ${encre}50`,
                  borderRadius: '0 3px 3px 0',
                  padding: '12px 14px',
                  outline: 'none', caretColor: accent, letterSpacing: '0.15em',
                  width: '100%',
                }}
              />
              {joinError && (
                <p style={{ ...mono, fontSize: 13, color: '#b22c20' }}>{joinError}</p>
              )}
              <button
                type="submit"
                disabled={joining || !joinCode.trim()}
                style={{ background: 'transparent', color: encre, ...mono, fontSize: 17, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.8em 1.8em', border: `1px solid ${encre}`, borderRadius: 3, cursor: 'pointer', opacity: joining || !joinCode.trim() ? 0.4 : 1 }}
              >
                {joining ? tr('RECHERCHE…', 'SEARCHING…') : tr('REJOINDRE', 'JOIN')}
              </button>
            </form>
          </div>

        </motion.div>
      )}
    </PageTransition>
  )
}

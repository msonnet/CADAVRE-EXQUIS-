// src/registers.js
// 50 registres "latents" : lexique + templates. Aucun import externe.
// Le core du moteur peut fonctionner sans ce fichier si besoin (fallback géré dans poet.js).

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function safeArr(x) {
  return Array.isArray(x) ? x : [];
}

function expandTemplate(tpl, tok) {
  // Remplace {KEY} par un token du registre ; si absent -> vide.
  return tpl.replace(/\{([A-Z0-9_]+)\}/g, (_, key) => {
    const a = safeArr(tok[key]);
    return a.length ? pick(a) : "";
  }).replace(/\s+/g, " ").trim();
}

export const REGISTERS = [
  // 1) Physique / maths
  { id:"phys", w:1.0,
    tok:{ LOC:["à l’interface","dans le champ","au bord du seuil","hors du repère"],
      N:["entropie","vecteur","inertie","gradient","isotropie","singularité","trajectoire","saturation"],
      V:["dérive","s’inverse","se propage","s’effondre","se stabilise","bifurque","se calcule"],
      A:["critique","instable","fini","infime","asymptotique","brutal","continu"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{N} {V} {LOC}"] },

  // 2) Chimie
  { id:"chim", w:1.0,
    tok:{ LOC:["au fond du bécher","dans l’odeur","sous la hotte","sur la paillasse"],
      N:["précipité","solvant","catalyse","émulsion","résidu","oxydation","réactif","titrage"],
      V:["fume","s’oxyde","se sépare","coagule","attaque","dissout","décante"],
      A:["acide","basique","volatile","opaque","stérile","actif"] },
    tpl:["{LOC} {N} {V}","{N} {A}, {V} {LOC}","{V} : {N} {A}"] },

  // 3) Astronomie
  { id:"astro", w:1.0,
    tok:{ LOC:["à l’azimut","dans la nuit polaire","sur l’orbite","au zénith","à contre-constellation"],
      N:["solstice","éphéméride","comète","apogée","périgée","éclipse","météore","latitude"],
      V:["décroît","se décale","s’allume","s’éteint","traverse","revient","dérange"],
      A:["nocturne","froid","oblique","muet","immobile"] },
    tpl:["{N} {V} {LOC}","{LOC} {N} {A} {V}","{N} : {A} {V}"] },

  // 4) Climat / météo
  { id:"meteo", w:1.0,
    tok:{ LOC:["sur la peau","au ras du monde","dans les gouttières","au revers du ciel"],
      N:["front","rafale","bruine","dépression","givre","brouillard","orage","indice"],
      V:["racle","tombe","stagne","monte","s’abat","s’effiloche"],
      A:["humide","sec","tranchant","lourd","sale","léger"] },
    tpl:["{N} {A} {V} {LOC}","{LOC} {N} {V}","{N} : {V}"] },

  // 5) Économie / travail
  { id:"eco", w:0.9,
    tok:{ LOC:["à la fin du mois","sur la feuille","dans la caisse","à la marge"],
      N:["rendement","charge","dette","flux","cadence","marge","coût","bilan","rentabilité"],
      V:["grince","s’alourdit","se renverse","s’efface","revient","pèse"],
      A:["brut","net","fictif","dur","mince","impossible"] },
    tpl:["{N} {A} {V} {LOC}","{LOC} {N} {V}","{N} : {V}"] },

  // 6) Technologique / réseau
  { id:"techno", w:0.9,
    tok:{ LOC:["dans le flux","sur l’interface","dans la latence","au protocole"],
      N:["signal","latence","packet","cache","interface","protocole","erreur","session"],
      V:["sature","déconnecte","rebondit","chiffre","dérape","se fige"],
      A:["muet","instable","opaque","brûlant","fantôme"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{N} {V} {LOC}"] },

  // 7) Domestique
  { id:"dom", w:0.9,
    tok:{ LOC:["dans l’évier","sur le drap","au seuil","près du frigo"],
      N:["vaisselle","ampoule","serrure","drap","couette","tasse","cendrier","carreau"],
      V:["colle","couine","déborde","clignote","se casse","traîne","se vide"],
      A:["tiède","sale","cassé","muet","terne","gras"] },
    tpl:["{LOC} {N} {V}","{N} {A} {V}","{N} {V} {LOC}"] },

  // 8) Ville / urbanisme
  { id:"ville", w:0.9,
    tok:{ LOC:["au carrefour","sous le néon","dans la ruelle","sur le périph"],
      N:["bitume","vitrine","sirène","trottoir","cage d’escalier","panneau","grille","façade"],
      V:["hurle","clignote","avale","se ferme","se fissure","bave"],
      A:["gris","électrique","sale","vide","trop clair"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{N} {V} {LOC}"] },

  // 9) Religion / rituel
  { id:"rituel", w:0.7,
    tok:{ LOC:["à la vigile","dans l’encens","sous l’icône","au bord du chœur"],
      N:["relique","absolution","pénitence","psaume","icône","vœu","cierge","confession"],
      V:["pèse","tremble","pardonne","condamne","s’allume","s’éteint","résonne"],
      A:["muet","fervent","noir","pauvre","solennel"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 10) Guerre / stratégie
  { id:"guerre", w:0.7,
    tok:{ LOC:["sur la ligne","au repli","dans la tranchée","à l’arrière"],
      N:["front","repli","assaut","trêve","cible","munitions","patrouille","barrage"],
      V:["avance","recule","frappe","suspend","saigne","se tait"],
      A:["froid","méthodique","brutal","inutile","tactique"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} {LOC}"] },

  // 11) Botanique
  { id:"bota", w:0.8,
    tok:{ LOC:["dans l’humus","sur l’écorce","à l’ombre humide","au bord du talus"],
      N:["rhizome","lichen","pollen","sève","écorce","spore","ronce","mousse"],
      V:["prend","s’accroche","suinte","pousse","se fane","revient"],
      A:["tenace","vert sombre","acide","mince","lent"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{N} {V} {LOC}"] },

  // 12) Géologie
  { id:"geo", w:0.8,
    tok:{ LOC:["dans la strate","sous la faille","au pli","au fond de la roche"],
      N:["schiste","basalte","faille","sédiment","strates","granite","érosion","cendre"],
      V:["pèse","craque","se tasse","se fend","remonte","s’érode"],
      A:["ancien","noir","rugueux","froid","compact"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{N} {V} {LOC}"] },

  // 13) Archive / mémoire
  { id:"arch", w:0.8,
    tok:{ LOC:["dans l’archive","au palimpseste","dans la marge","sur la page grattée"],
      N:["vestige","palimpseste","annotation","couche","rature","archive","index","trace"],
      V:["demeure","résiste","s’efface","revient","se superpose","saigne"],
      A:["illisible","tenace","faux","ancien","déchiré"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 14) Cinéma / photo
  { id:"cine", w:0.6,
    tok:{ LOC:["au plan fixe","dans le champ","hors-champ","sur la pellicule"],
      N:["contre-jour","montage","cadre","focale","grain","plan-séquence","zoom","flou"],
      V:["coupe","tremble","expose","sature","efface","révèle"],
      A:["sale","lent","brut","muet","sur-exposé"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} {LOC}"] },

  // 15) Musique
  { id:"music", w:0.6,
    tok:{ LOC:["sur la corde","dans la caisse","au tempo","au silence"],
      N:["harmonique","dissonance","métronome","basse","accord","bourdonnement","arpège","refrain"],
      V:["grince","résonne","s’étire","se casse","revient","sature"],
      A:["faux","sourd","lent","aigu","cassé"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 16) Cuisine
  { id:"cuisine", w:0.7,
    tok:{ LOC:["dans la casserole","sur la planche","au fond de la bouche","dans l’huile chaude"],
      N:["saumure","épice","brûlure","levain","vinaigre","mie","croûte","graisse"],
      V:["mord","colle","tourne","réduit","caramélise","déborde"],
      A:["amer","fort","ranci","doux","piquant"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 17) Médecine clinique
  { id:"med", w:0.8,
    tok:{ LOC:["en salle d’attente","au diagnostic","sur l’ECG","dans la suture"],
      N:["symptôme","pronostic","fièvre","lésion","suture","anamnèse","fracture","cicatrice"],
      V:["persiste","saigne","s’aggrave","se calme","revient","se ferme"],
      A:["aigu","chronique","muet","visible","latent"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 18) Droit / procédure
  { id:"droit", w:0.8,
    tok:{ LOC:["au greffe","à l’audience","dans la clause","au recours"],
      N:["contentieux","injonction","dérogation","décision","recours","jurisprudence","preuve","annexe"],
      V:["tombe","suspend","condamne","annule","exécute","diffère"],
      A:["provisoire","définitif","contradictoire","muet","irrecevable"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 19) Sport / corps en action
  { id:"sport", w:0.6,
    tok:{ LOC:["à l’échauffement","dans la reprise","sur la ligne","au souffle"],
      N:["foulée","tension","chute","relance","appui","élan","fatigue","crampe"],
      V:["plie","accélère","lâche","reprend","tremble","tient"],
      A:["court","sec","brutal","tenace","raté"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 20) Maritime
  { id:"mer", w:0.7,
    tok:{ LOC:["sur la coque","au large","dans l’écume","à la marée"],
      N:["marée","écume","quille","houle","caps","courant","amers","sel"],
      V:["monte","casse","racle","revient","dérive","avale"],
      A:["salé","noir","lent","oblique","froid"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 21) Forêt / chasse
  { id:"foret", w:0.7,
    tok:{ LOC:["dans le sous-bois","au poste","sur la piste","entre les troncs"],
      N:["piste","affût","empreinte","ramure","aboi","roncier","clairière","morsure"],
      V:["guette","s’efface","revient","mord","se tait","passe"],
      A:["noir","frais","sauvage","muet","ras"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 22) Enfance
  { id:"enfance", w:0.6,
    tok:{ LOC:["dans la cour","sur le banc","au cartable","dans la chambre bleue"],
      N:["bille","craie","peur","cachette","cartable","règle","peluche","mensonge"],
      V:["tremble","se cache","revient","rit","pleure","griffe"],
      A:["petit","faux","immense","muet","sale"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 23) Nuit / insomnie
  { id:"insom", w:0.7,
    tok:{ LOC:["à trois heures","dans le drap","au plafond","dans le noir"],
      N:["insomnie","tic-tac","vertige","veille","faim","hallucination","silence","pulsation"],
      V:["revient","râpe","s’installe","ne cède pas","se répète","dévie"],
      A:["sec","lent","trop clair","épais","sans fin"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },
    
  // 24) Mythologie (sobre)
  { id:"myth", w:0.5,
    tok:{ LOC:["sur l’autel","au labyrinthe","au seuil du fleuve","dans la caverne"],
      N:["oracle","labyrinthe","cyclope","sirène","hydre","fil","offrande","exil"],
      V:["dévore","égare","répond","se retire","revient","enchaîne"],
      A:["ancien","muet","terrible","doré","froid"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 25) Papier / bureaucratie (distinct de droit)
  { id:"paper", w:0.8,
    tok:{ LOC:["sur le formulaire","à la signature","dans la pile","au guichet"],
      N:["tampon","cachet","délai","accusé","déclaration","courrier","réclamation","dossier"],
      V:["bloque","traîne","refuse","valide","renvoie","perd"],
      A:["illisible","urgent","tardif","froid","faux"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 26) Atelier finition (spécialisé)
  { id:"finish", w:0.9,
    tok:{ LOC:["en cabine","au voile","sur le fil","au contre-fil"],
      N:["peau d’orange","coulure","matité","flash-off","tension de surface","reprise","nuance","voilage"],
      V:["marque","revient","se lève","s’ouvre","se ferme","accroche","tire"],
      A:["trop gras","trop sec","tendu","sale","léger"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 27) Bois (matière)
  { id:"bois", w:0.9,
    tok:{ LOC:["dans le fil","au pore","sur l’aubier","au cœur du bois"],
      N:["aubier","pore","contre-fil","nœud","veine","écharde","tanin","fibres"],
      V:["boit","remonte","saigne","accroche","se rouvre","se marque"],
      A:["clair","brûlé","nerveux","sec","humide"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 28) Informatique “bureau”
  { id:"desk", w:0.6,
    tok:{ LOC:["dans le dossier","sur l’onglet","au raccourci","dans la corbeille"],
      N:["chemin","fichier","permissions","dossier","log","cache","onglet","processus"],
      V:["plante","revient","boucle","s’efface","se verrouille","se relance"],
      A:["fantôme","invalide","corrompu","lent","muet"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 29) Psyché (sobre)
  { id:"psy", w:0.8,
    tok:{ LOC:["dans la tête","au bord du rêve","sous le mot","dans l’angle mort"],
      N:["compulsion","honte","désir","déni","fêlure","panique","apaisement","fixation"],
      V:["revient","se déplace","mord","se retire","s’accroche","se dissout"],
      A:["muet","brut","tenace","froid","secret"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 30) Sensoriel (goût/odeur/texture)
  { id:"sens", w:0.8,
    tok:{ LOC:["sur la langue","dans le nez","sous les doigts","dans la salive"],
      N:["amertume","fer","cendre","sucre","gras","sable","aigre","fumée"],
      V:["colle","mord","râpe","s’étale","remonte","brûle"],
      A:["sec","chaud","froid","sale","dense"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 31) Temporalité
  { id:"temps", w:0.7,
    tok:{ LOC:["à l’instant","dans l’après","au retour","entre deux dates"],
      N:["retard","avance","interruption","sursis","cycle","répétition","fissure","moment"],
      V:["dérive","revient","s’arrête","repart","se répète","se brise"],
      A:["minuscule","long","tardif","précis","faux"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 32) Électricité
  { id:"elec", w:0.6,
    tok:{ LOC:["dans le câble","au contact","sous tension","dans l’étincelle"],
      N:["court-circuit","résistance","charge","étincelle","coupure","arc","fusible","bruit blanc"],
      V:["claque","sature","coupe","revient","brûle","grésille"],
      A:["sec","violent","bleu","muet","instable"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 33) Textile
  { id:"textile", w:0.5,
    tok:{ LOC:["dans la couture","sur la trame","au revers","dans l’ourlet"],
      N:["trame","ourlet","fil","déchirure","pli","tissu","suture","laine"],
      V:["craque","tire","se défait","se rapièce","plie","s’accroche"],
      A:["usé","tendu","mince","sale","chaud"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 34) Métal / mécanique
  { id:"meca", w:0.7,
    tok:{ LOC:["dans l’engrenage","sur l’axe","au roulement","dans la graisse"],
      N:["roulement","axe","engrenage","couple","vibration","jeu","friction","tôle"],
      V:["vibre","grince","se voile","s’use","casse","reprend"],
      A:["sec","lourd","froid","faussé","brut"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 35) Animal
  { id:"animal", w:0.6,
    tok:{ LOC:["dans la gueule","sous la fourrure","au terrier","à l’affût"],
      N:["morsure","aboi","griffure","proie","haleine","trace","pelage","crocs"],
      V:["guette","mord","fuit","revient","s’ébroue","se tait"],
      A:["sale","tendu","noir","rapide","muet"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 36) Géométrie / architecture
  { id:"archi", w:0.6,
    tok:{ LOC:["dans l’angle","au plan","sur l’arête","au volume"],
      N:["arête","volume","plan","angle","poutre","voûte","niche","axe"],
      V:["tient","cède","plie","se creuse","se ferme","s’ouvre"],
      A:["nu","froid","droit","cassé","creux"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 37) Maritime industriel (ports/containers)
  { id:"port", w:0.5,
    tok:{ LOC:["au terminal","sur le quai","dans le conteneur","au dock"],
      N:["conteneur","grue","manifeste","bordereau","palette","soute","arrimage","douane"],
      V:["pèse","bloque","décharge","s’entasse","passe","retient"],
      A:["lourd","sale","scellé","muet","tardif"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 38) Érotique indirect (sans pornographie)
  { id:"eros", w:0.35,
    tok:{ LOC:["au creux","dans le souffle","sur la nuque","dans la paume"],
      N:["nuque","frisson","approche","vertige","peau","baiser","distance","chaleur"],
      V:["tremble","attire","repousse","revient","insiste","se tait"],
      A:["lente","brûlante","muette","proche","fugitive"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 39) Jeux / hasard
  { id:"hasard", w:0.5,
    tok:{ LOC:["au tirage","sur la table","dans le paquet","au dé"],
      N:["hasard","tirage","dé","carte","mise","chance","perte","coup"],
      V:["tombe","revient","triche","s’inverse","gagne","perd"],
      A:["sec","bête","lumineux","noir","ridicule"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 40) Presse / info
  { id:"presse", w:0.4,
    tok:{ LOC:["au titre","dans la brève","au direct","dans l’édition"],
      N:["brève","titre","communiqué","source","témoignage","rectificatif","rumeur","démenti"],
      V:["affirme","déforme","insiste","se contredit","publie","efface"],
      A:["officiel","anonyme","froid","urgent","faux"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 41) Métaphysique sèche
  { id:"meta", w:0.6,
    tok:{ LOC:["au seuil","dans l’absence","à l’écart","dans le reste"],
      N:["présence","absence","reste","vide","preuve","fêlure","écart","nécessité"],
      V:["demeure","se retire","se contredit","revient","pèse","s’efface"],
      A:["nu","froid","tenace","muet","impossible"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 42) Rêve (procédural)
  { id:"reve", w:0.7,
    tok:{ LOC:["dans le rêve","au bord du sommeil","dans le couloir sans fin","dans la brume"],
      N:["double","porte","métamorphose","couloir","main","visage","chambre","signal"],
      V:["se retourne","s’ouvre","se ferme","se répète","se dissout","revient"],
      A:["impossible","muet","trop clair","sale","lisse"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 43) Odeur / fumée
  { id:"fumee", w:0.6,
    tok:{ LOC:["dans la fumée","au fond du nez","sur le tissu","dans la gorge"],
      N:["fumée","suie","brûlé","cendre","fer","huile","ozone","ranci"],
      V:["remonte","colle","brûle","râpe","envahit","s’éteint"],
      A:["âcre","dense","noir","froid","sale"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 44) Transport (train/route)
  { id:"trans", w:0.5,
    tok:{ LOC:["sur la voie","à l’arrêt","dans la rame","au feu rouge"],
      N:["voie","rame","retard","carrefour","ticket","bretelle","panne","quai"],
      V:["attend","secoue","déraille","revient","coupe","file"],
      A:["sale","tardif","brut","muet","vide"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 45) Argent concret
  { id:"cash", w:0.5,
    tok:{ LOC:["dans la poche","au distributeur","sur le comptoir","dans la paume"],
      N:["pièce","billet","reste","manque","solde","pourboire","crédit","prix"],
      V:["file","manque","revient","pèse","se vole","se perd"],
      A:["sale","petit","froid","faible","trop cher"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 46) Rumeur / social
  { id:"social", w:0.4,
    tok:{ LOC:["dans le couloir","au message","dans la foule","sur l’écran"],
      N:["rumeur","moquerie","silence","honte","regard","mensonge","posture","écho"],
      V:["circule","pique","efface","revient","colle","détruit"],
      A:["public","faux","cruel","léger","tenace"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 47) Matière / textures
  { id:"matiere", w:0.8,
    tok:{ LOC:["sous les doigts","à la surface","dans le grain","sur la peau"],
      N:["grain","pore","rayure","croûte","boue","poudre","vernis","rugosité"],
      V:["accroche","raye","s’effrite","se tend","se ferme","se rouvre"],
      A:["sec","gras","lisse","rugueux","trop fin","trop gros"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 48) Rhétorique (comparaison / litote / oxymore) — registre “forme”
  { id:"rhet", w:0.5,
    tok:{ LOC:["comme","tel","à la façon de","comme si"],
      N:["clarté noire","douce violence","vide plein","froid brûlant","joie funèbre","lente urgence"],
      V:["revient","tient","se contredit","se brise","se recolle"],
      A:["muet","net","sale","froid","tendu"] },
    tpl:["{N} {V}","{LOC} {N}","{N} : {A}"] },

  // 49) Objets “métaphore matérielle”
  { id:"obj", w:0.6,
    tok:{ LOC:["sur la table","dans la poche","au fond du sac","au bord du lit"],
      N:["harpe vitrifiée","miroir sans reflet","clé tordue","verre fêlé","couteau émoussé","lampe morte","ruban usé","carnet raturé"],
      V:["pèse","coupe","tremble","se casse","se recolle","s’allume","s’éteint"],
      A:["inutile","muet","sale","trop lourd","trop fragile"] },
    tpl:["{LOC} {N} {V}","{N} {A} : {V}","{V} : {N}"] },

  // 50) Saccades orales “contrôle”
  { id:"pulse", w:0.35,
    tok:{ LOC:["là","ici","maintenant","tout de suite","d’accord","tant pis"],
      N:["rien","tout","un truc","la suite","le reste","le vide"],
      V:["continue","arrête","revient","tient","lâche","passe"],
      A:["sale","net","trop","plus","encore"] },
    tpl:["{LOC}, {V}","{LOC} : {N}","{V} {LOC}"] }
];

// Sélection de registres actifs : 3 à 5 max.
export function pickActiveRegisters(rng = Math.random) {
  const count = 3 + Math.floor(rng() * 3); // 3..5
  // tirage pondéré sans remplacement
  const pool = REGISTERS.slice();
  const chosen = [];
  for (let i = 0; i < count && pool.length; i++) {
    const total = pool.reduce((s, r) => s + (r.w || 1), 0);
    let x = rng() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      x -= (pool[idx].w || 1);
      if (x <= 0) break;
    }
    chosen.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
  }
  return chosen;
}

export function generateFromRegister(reg) {
  try {
    const line = expandTemplate(pick(reg.tpl), reg.tok);
    return line;
  } catch {
    return "";
  }
}

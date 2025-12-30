export const LEX = {
  // Connecteurs typés (anti-bugs)
HINGE_VERB: [
  // exigent une proposition verbale derrière (GV)
  "sans que",
  "bien que",
  "pendant que",
  "lorsque",
  "alors que",
  "tandis que",
  "si tant est que",
  "pour peu que",
  "à condition que",
  "à supposer que",
  "de sorte que",
  "en sorte que",
  "si bien que",
  "tant et si bien que",
  "pour autant que",
  "à moins que",
  "de peur que"
],

HINGE_NOM: [
  // exigent un groupe nominal derrière (GN)
  "à cause de",
  "à l’insu de",
  "au regard de",
  "en dépit de",
  "en vertu de",
  "à force de",
  "par l’effet de",
  "par le fait de",
  "à la faveur de",
  "sous couvert de",
  "à défaut de",
  "faute de",
  "au risque de",
  "par accident",
  "par dépit",
  "par excès",
  "par défaut",
  "à l’idée de",        // IMPORTANT : on évite "à l’idée que" (source d’erreurs)
  "dans l’hypothèse de" // idem
],

HINGE_FREE: [
  // libres (mais sans "que") : peuvent précéder GN ou GV selon template
  "malgré",
  "contre",
  "hors",
  "sans",
  "vers",
  "avec",
  "sous",
  "sur"
],
  // Charnières / connecteurs (variés)
  HINGE: [
    "comme si","parce que","alors que","tandis que","sauf que","à force de","jusqu’à","au moment où",
    "pendant que","à cause de","lorsque","toutefois","or","mais","et pourtant","si bien que",
    "vu que","à mesure que","dès que","bien que","quoique","sans que","pour peu que","tant que",
    "à peine","de sorte que","au point que","au prétexte que","par-dessus tout","malgré tout",
   
    // Ajouts connecteurs (diversité, rareté gérée par poet.js)
"du moment que","à supposer que","dans la mesure où","à condition que",
"quitte à","faute de quoi","sans quoi","au risque de","à l’insu de","par l’effet de",
"par le fait que","dans l’hypothèse où","à force","en vertu de",
"de peur que","si tant est que","à moins que","pour autant que","en sorte que",
"à seule fin que","à ceci près que","pour la simple raison que","à ceci qu’on",
"à cause que","par accident","par dépit","par excès","par défaut","malgré que",
"à rebours de","contre toute attente","à la faveur de","sous couvert de","en dépit de",
"à peine que","pour peu","tant et si bien que","si bien","de telle manière que"


  ],

  // Adverbes / micro-rythme
  ADVERB: [
    "doucement","brusquement","à peine","sans bruit","de biais","à rebours","par instants","tout à coup",
    "en secret","de travers","en catimini","à la renverse","à vif","en plein","d’un seul souffle","à contre-jour",
    "dans l’angle mort","au ralenti","au galop","à la diable","en sourdine","à mains nues"
  ],

  // Archaïsmes / soutenu discret
  ARCHA: [
    "naguère","d’antan","par-delà","or donc","cependant","toutefois","ainsi","nonobstant","mêmement",
    "derechef","à l’envi","de guingois","par surcroît","cahin-caha","à dessein","sous peu","de facto"
  ],

  // Figures : matériaux
  FIG_COMPARE: ["comme","tel","pareil à","ainsi que","à la façon de","comme si"],
  FIG_LITOTE: [
    "ce n’est pas rien","ce n’est pas peu dire","je ne dirais pas non","on ne peut pas dire que",
    "ce n’est pas sans","je n’ignore pas","je n’en fais pas mystère","ce n’est pas le moindre"
  ],
  FIG_METONYMY: [
    "la bouche pour la parole","la main pour le geste","la peau pour le monde","le toit pour l’abri",
    "la table pour le travail","la vitre pour le regard","la rue pour la rumeur","le papier pour l’ordre",
    "la pierre pour la mémoire","la lampe pour la veille"
  ],
  FIG_OXYMORON: [
    "clarté noire","silence tonitruant","douce violence","froid brûlant","lente urgence",
    "tendre cruauté","chaos ordonné","vide plein","lucidité aveugle","joie funèbre"
  ],

  // Antonymes (pour renversements)
  ANTONYM_PAIRS: [
    ["plein","vide"],["clair","obscur"],["lisse","rugueux"],["lent","brutal"],["chaud","froid"],
    ["haut","bas"],["proche","loin"],["sage","fou"],["sec","moite"],["docile","sauvage"],
    ["net","boueux"],["dur","mou"],["vrai","faux"],["visible","invisible"],["pur","sale"],
    ["doux","âpre"],["vivant","mort"],["ouvert","clos"]
  ],

  // ORAL (cru réel mais pas gimmick)
  ORAL: [
    "je ne sais pas","je vois","je ne vois pas","j’entends","je n’entends rien","ça revient","ça tient",
    "ça ne tient pas","ça commence","ça finit","écoute","regarde","laisse","continue","arrête",
    "tant pis","peu importe","je te cherche","je me perds","je reviens","je te jure","ça me suit",
    "ça m’échappe","ça me traverse","je fais semblant","j’ai pas le choix","je m’en fous","j’en peux plus"
  ],
  ORAL_CRU: [
    "ça me fait chier","j’en ai ras le cul","putain","ta gueule","j’ai la gerbe","ça pue","je crève",
    "ça me saoule","tu me fatigues","je suis à bout","j’ai les nerfs","ça part en vrille","ça m’use"
  ],

  // Technique atelier (élargi)
  TECH_ATELIER: [
    "grain 80","grain 120","grain 150","grain 180","grain 220","grain 240","grain 320",
    "égrenage","ponçage à blanc","dépoussiérage","dégraissage","masquage","rechampir",
    "fond dur","bouche-pores","vernis PU","vernis acrylique","teinte à l’eau","teinte au solvant",
    "diluant","durcisseur","catalyse","flash-off","coulure","peau d’orange","tension de surface",
    "pore ouvert","pore fermé","fil du bois","contre-fil","rayure","reprise","nuance","voile","charge","matité",
    "atelier","cabine","pistolet","buse 1.3","buse 1.8","pression","brouillard","surcharge","voilage"
  ],

  // Anatomie/physio (élargi)
  TECH_ANAT: [
    "trachée","diaphragme","clavicule","sternum","tendon","nerf","synapse","capillaire","artère",
    "muqueuse","haleine","salive","sueur","sang","pus","cornée","rétine","larynx","vertèbre",
    "cartilage","épiderme","cicatrice","hématome","pouls","crâne","pharynx","bronche","médulle","vésicule"
  ],

  // Administratif / juridique (élargi)
  TECH_ADMIN: [
    "dossier incomplet","pièce justificative","numéro de suivi","formulaire","mise en demeure","avis défavorable",
    "délai de traitement","notification","conformité","clause","annexe","preuve","référence dossier",
    "courrier recommandé","signature requise","procédure","contentieux","décision","recours","dérogation",
    "injonction","exécution provisoire","attestation","certification","cachet","réclamation"
  ],

  // Haut niveau conceptuel (élargi)
  HIGH_A: [
    "la persistance du phénomène","la mécanique du manque","la fracture du sens","l’ombre d’une preuve",
    "le seuil","l’intervalle","la défaillance","l’écart","la gravité du lien","l’exactitude du vide",
    "le nerf de la question","la rumeur du réel","le chantier du vrai","l’axiome","la fêlure","la densité de l’absence",
    "le protocole des rêves","la syntaxe du monde","l’hémorragie du sens","la couture du hasard"
  ],
  HIGH_B: [
    "l’hypothèse d’un corps","la logique de la ruine","l’expérience du négatif","la théorie du reste",
    "l’énigme de la présence","l’économie du réel","la violence du vrai","le litige du monde","le destin du déchet",
    "la métaphysique du seuil","la jurisprudence de la nuit","l’algèbre des ombres","la géométrie de la faute",
    "la chimie du soupçon","l’éthique du gouffre","la botanique du désastre"
  ],
  HIGH_C: [
    "en l’état","à ce stade","au regard des faits","en dernière instance","à défaut","par principe",
    "en conséquence","sous réserve","de facto","in fine","à titre provisoire","à toutes fins utiles","à l’amiable",
    "sans préjudice","en cas de force majeure"
  ],

  // Verbes / actions poétiques (très élargi)
  VERB_PHRASE: [
    "se tait","se tait net","grince","grince encore","plie","plie sans bruit","cède","cède d’un coup",
    "s’accroche","insiste","traîne","revient","avale la nuit","crache dehors","salit tout","tord la lumière",
    "saigne doucement","se colle aux murs","ne tient plus","dénoue","délie","efface","laisse une trace","coupe court",
    "mâche le jour","renverse l’ordre","avale sa langue","déchire le silence","suture le vide","dépose un poison",
    "fait mine","se dédouble","se contredit","joue au mort","répète sans croire","se met à rire","s’éteint","s’allume",
    "se dissout","se durcit","se fend","se rature"
  ],

  // Narratif (élargi)
  NARR_GN: [
    "un homme sans âge","une femme de passage","un enfant sans visage","la chambre d’hôtel","le couloir",
    "la porte du fond","la lettre jamais partie","le verre posé","la lampe morte","la gare","la cuisine froide",
    "la cage d’escalier","le banc mouillé","la ruelle","le carrefour","la vitrine","le taxi","le quai","le portail",
    "le grenier","la cave","le terrain vague","la fête éteinte"
  ],

  

  // GN / GV / GP poétiques (élargis en profondeur)
  POETIC_GN: [
    "la nuit sans fond","la brume profonde","le silence épais","la honte debout","la loi poreuse","le seau de cendre",
    "la vitre fendue","le couteau de velours","l’œil froid","la bouche fermée","la main sale","le corps las",
    "l’atelier vide","la faim froide","le jour obscur","l’ombre debout","la poussière","la rouille",
    "la pluie de verre","le rire sans dents",

    "la pierre noire","la gorge sèche","le cœur en copeaux","la lumière malade","la cloche fêlée","la peau lucide",
    "la langue amère","le fil nerveux","la ferraille tendre","le lait de suie","la neige sale","le goudron clair",
    "la table muette","le plafond bas","la chaise boiteuse","la fenêtre borgne","le miroir sans reflet","la pluie morte",
    "la chaleur froide","le souffle coupé","la peur calme","la colère blanche","le sommeil en vrac","l’odeur de fer"
  ],

  POETIC_GV: [
    "ne tient plus","se tait net","plie sans bruit","grince encore","avale la nuit","crache dehors","salit tout",
    "tord la lumière","saigne doucement","revient trop vite","se colle aux murs","cède d’un coup",
    "se retourne","se déchire","se contredit","se dissout","se fige","se rature","se casse","se recolle",
    "s’allume","s’éteint","se dédouble","se renverse","s’ébrèche","s’enfonce","se relève"
  ],

  POETIC_GP: [
    "dans la gorge","sous la peau","au fond du corps","sur la langue","contre le béton","au pied du mur","dans la brume",
    "entre deux portes","à même le sol","dans l’atelier","sur le quai","dans l’ombre","au bord du ravin","au fond du puits",
    "sur la rétine","dans les paumes","au creux du ventre","dans la cage thoracique","au revers du jour","dans l’angle mort",
    "à la jointure","dans la poussière","sur la table","à contre-jour","à ras du monde"
  ],

  // “pauvre” : au plancher (rare)
  POOR: ["je me tais","ça suffit","il n’y a rien","tant pis","d’accord","plus rien","pas maintenant","laisse"]
};
// Réactions par proximité (synonymie / champ)
export const REACT = {
  nuit: ["ombre", "veille", "insomnie", "noir", "étoile", "gouffre"],
  mur: ["béton", "paroi", "cloison", "angle", "faïence", "front"],
  peau: ["pore", "cicatrice", "épiderme", "chair", "grain", "brûlure"],
  langue: ["salive", "amertume", "mot", "morsure", "bégaiement"],
  verre: ["vitre", "éclat", "fêlure", "miroir", "coupure"],
  pluie: ["bruine", "goutte", "orage", "humide", "ruissellement"],
  atelier: ["cabine", "ponçage", "voile", "flash-off", "coulure"],
  honte: ["rougir", "dégoût", "repli", "silence", "basse"],
  amour: ["nuque", "frisson", "distance", "baiser", "chaleur"],
};

// Réactions par antonymie (volontairement “petit”, extensible)
export const REACT_ANT = {
  nuit: ["jour", "lumière", "midi"],
  noir: ["blanc", "clair"],
  froid: ["chaud", "brûlant"],
  chaud: ["froid", "glacé"],
  vide: ["plein", "chargé"],
  plein: ["vide", "creux"],
  silence: ["bruit", "hurlement"],
  calme: ["panique", "orage"],
  vrai: ["faux", "mensonge"],
  mort: ["vivant", "souffle"],
  sec: ["humide", "mouillé"],
  dur: ["mou", "tendre"],
};

// Templates d’insertion (réaction “surréaliste” mais contrôlée)
export const REACT_TPL = {
  echo: ["— {W}", ", {W}"],
  syn: ["— dans {X}", "— sous {X}", "— contre {X}", "— au bord de {X}"],
  ant: ["— et pourtant {A}", "— à rebours : {A}", "— l’inverse : {A}"],
  shiftVerb: ["je {V}", "tu {V}", "{V} encore", "ça {V}"],
  shiftNoun: ["le {N} de {W}", "{W} : le {N}", "la {N} de {W}"],
  shiftAdj: ["{W}, {ADJ}", "si {ADJ}", "trop {ADJ}"],
};

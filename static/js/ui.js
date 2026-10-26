(function () {
  'use strict';

  var ICONS = {
    'badge-check': '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    'share-2': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    newspaper: '<path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M10 6h8v4h-8z"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.401 5.401 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    'check-circle': '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    bold: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
    italic: '<line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/>',
    heading: '<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>',
    list: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
    'list-ordered': '<path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    code: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    quote: '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    'corner-up-left': '<path d="M20 20v-7a4 4 0 0 0-4-4H4"/><path d="m9 14-5-5 5-5"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
    'more-horizontal': '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
    'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    'align-right': '<line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/>',
    'align-left': '<line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    wand: '<path d="m3 21 9-9"/><path d="M15 4V2"/><path d="M15 16v-2"/><path d="m8 9 3-3"/><path d="M9 18h3"/><path d="M18 12h2"/><path d="m14.5 7.5 11"/><path d="m14.5 14.5 1 1"/><path d="m17.5 17.5 1 1"/><path d="m3.5 7.5 1 1"/><path d="m3.5 10.5 1 1"/><path d="m10.5 3.5 1 1"/><path d="m16.5 3.5 1 1"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    'undo-2': '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/>',
    whatsapp: '<path fill="currentColor" stroke="none" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>',
    instagram: '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    x: '<path fill="currentColor" stroke="none" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
    threads: '<path fill="currentColor" stroke="none" d="M12.186 24h-.007c-3.581-.024-6.334-1.196-8.184-3.496C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.508C5.845 1.186 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.477l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.542.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.157 1.43 1.781 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.731.79-1.194-.61-2.364-.218-3.259-.801-.94-.61-1.485-1.49-1.532-2.466-.047-.976.41-1.902 1.27-2.524.741-.538 1.734-.863 2.989-.955.994-.074 1.916-.05 2.77.068-.104-.744-.3-1.34-.59-1.78-.4-.6-1.03-.9-1.89-.9h-.026c-.673 0-1.587.203-2.094 1.148l-1.496-1.01c.846-1.556 2.445-2.315 4.654-2.315h.044c3.422 0 5.435 2.093 5.777 5.625.18.044.356.092.528.145 1.53.463 2.65 1.263 3.326 2.38.887 1.456.969 3.845-.948 5.725-1.495 1.46-3.27 2.103-6.12 2.126zm-4.72-9.662c-.044.763.196 1.587.886 2.038.542.356 1.258.514 2.112.466 1.398-.075 2.436-.608 3.106-1.58.504-.73.805-1.674.907-2.83-.858-.073-1.76-.096-2.706-.068-1.42.04-2.54.332-3.305.974-.715.612-1.084 1.403-1.0 2.0z"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
  };

  function icon(name, size, extra) {
    size = size || 18;
    var p = ICONS[name] || ICONS.sparkles;
    return '<svg class="ic ' + (extra || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  function iconFilled(name, size) {
    size = size || 18;
    var p = ICONS[name] || '';
    return '<svg class="ic ic-fill" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function svgURI(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function initialsAvatar(name, size) {
    size = size || 96;
    var n = String(name || '?').trim();
    var parts = n.split(/\s+/);
    var letters = [];
    if (/[A-Za-z]/.test(n)) {
      letters.push(parts[0].charAt(0));
      if (parts[1]) letters.push(parts[1].charAt(0));
    } else {
      letters.push(parts[0].charAt(0));
      if (parts[1]) letters.push(parts[1].charAt(0));
    }
    var label = letters.join('').toUpperCase();
    var h = 0;
    for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0;
    var pairs = [['#2563eb', '#4f46e5'], ['#0ea5e9', '#2563eb'], ['#7c3aed', '#a78bfa'], ['#0d9488', '#14b8a6'], ['#db2777', '#f472b6'], ['#ea580c', '#fb923c'], ['#4338ca', '#6366f1']];
    var c = pairs[Math.abs(h) % pairs.length];
    return svgURI(
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 96 96">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs>' +
      '<rect width="96" height="96" fill="url(#g)"/>' +
      '<circle cx="76" cy="18" r="26" fill="rgba(255,255,255,.12)"/>' +
    '<text x="48" y="60" text-anchor="middle" font-family="Tajawal, Segoe UI, sans-serif" font-size="34" font-weight="700" fill="#fff">' + esc(label) + '</text></svg>'
  );
}

  function userLetterAvatar(name, size) {
    size = size || 96;
    var n = String(name || '?').trim();
    var letter = n.charAt(0) || '?';
    var h = 0;
    for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0;
    var pairs = [['#2563eb', '#4f46e5'], ['#0ea5e9', '#2563eb'], ['#7c3aed', '#a78bfa'], ['#0d9488', '#14b8a6'], ['#db2777', '#f472b6'], ['#ea580c', '#fb923c'], ['#4338ca', '#6366f1']];
    var c = pairs[Math.abs(h) % pairs.length];
    return svgURI(
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 96 96">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs>' +
      '<rect width="96" height="96" rx="48" fill="url(#g)"/>' +
      '<text x="48" y="62" text-anchor="middle" font-family="Tajawal, Segoe UI, sans-serif" font-size="44" font-weight="700" fill="#fff">' + esc(letter) + '</text></svg>'
    );
  }

  function avatarOf(person, size) {
    size = size || 44;
    var src = (person && person.avatar) || initialsAvatar((person && (person.name || person.author)) || '?', size * 2);
    return '<img class="avatar" style="width:' + size + 'px;height:' + size + 'px" src="' + esc(src) + '" alt="" loading="lazy" decoding="async">';
  }

  function verifiedBadge(size) {
    size = size || 17;
    return '<svg class="verified-badge" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" role="img" aria-label="' + esc(I18n.t('certVerified')) + '">' +
      '<path fill="#1d9bf0" d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>' +
      '<path d="m9 12 2 2 4-4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var diff = Math.floor((Date.now() - d.getTime()) / 1000);
    var ar = I18n.getLang() === 'ar';
    if (diff < 60) return ar ? 'الآن' : 'now';
    var mins = Math.floor(diff / 60);
    if (mins < 60) return ar ? 'منذ ' + mins + ' د' : mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return ar ? 'منذ ' + hrs + ' س' : hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    if (days < 7) return ar ? 'منذ ' + days + ' ي' : days + 'd ago';
    return formatDate(iso);
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var locale = I18n.getLang() === 'ar' ? 'ar-SA' : 'en-US';
    try {
      return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return d.toDateString();
    }
  }

  var COUNT_WORDS = {
    ar: {
      likes: { zero: 'لا إعجابات', one: 'إعجاب واحد', two: 'إعجابان', few: '{n} إعجابات', many: '{n} إعجاباً' },
      comments: { zero: 'لا تعليقات', one: 'تعليق واحد', two: 'تعليقان', few: '{n} تعليقات', many: '{n} تعليقاً' },
      views: { zero: 'لا مشاهدات', one: 'مشاهدة واحدة', two: 'مشاهدتان', few: '{n} مشاهدات', many: '{n} مشاهدة' }
    },
    en: {
      likes: { zero: 'No likes', one: '1 like', two: '2 likes', few: '{n} likes', many: '{n} likes' },
      comments: { zero: 'No comments', one: '1 comment', two: '2 comments', few: '{n} comments', many: '{n} comments' },
      views: { zero: 'No views', one: '1 view', two: '2 views', few: '{n} views', many: '{n} views' }
    }
  };

  function countFmt(kind, n) {
    n = n || 0;
    var ar = I18n.getLang() === 'ar';
    var w = (COUNT_WORDS[ar ? 'ar' : 'en'])[kind] || COUNT_WORDS.en.likes;
    var word;
    if (n === 0) word = w.zero;
    else if (n === 1) word = w.one;
    else if (n === 2) word = w.two;
    else if (n <= 10) word = String(w.few).split('{n}').join(n);
    else word = String(w.many).split('{n}').join(n);
    return word;
  }

  function sanitize(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    tmp.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button,textarea').forEach(function (n) { n.remove(); });
    tmp.querySelectorAll('*').forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        var n = a.name.toLowerCase();
        var v = String(a.value || '').toLowerCase();
        if (n.indexOf('on') === 0 || v.indexOf('javascript:') === 0 || (n === 'href' && v.indexOf('data:') === 0 && !/data:image/.test(v))) {
          el.removeAttribute(a.name);
        }
      });
    });
    return tmp.innerHTML;
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 250);
    };
  }

  function observeNearViewport(target, callback, rootMargin) {
    if (!target || !window.IntersectionObserver) return null;
    var observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) callback();
    }, { rootMargin: rootMargin || '0px 0px 400px 0px' });
    observer.observe(target);
    return observer;
  }

  function toast(msg, type) {
    var root = document.getElementById('toastRoot');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    var ic = type === 'success' ? 'check-circle' : type === 'error' ? 'message-circle' : 'sparkles';
    el.innerHTML = icon(ic, 16) + '<span>' + esc(msg) + '</span>';
    root.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(function () {
      el.classList.remove('in');
      setTimeout(function () { el.remove(); }, 300);
    }, 2600);
  }

  function confirmBox(msg) {
    return new Promise(function (resolve) {
      var m = modal({
        title: I18n.t('confirm'),
        body: '<p class="modal-text">' + esc(msg) + '</p>',
        footer: '<button class="btn btn-ghost" data-x="0">' + esc(I18n.t('cancel')) + '</button>' +
                '<button class="btn btn-danger" data-x="1">' + esc(I18n.t('confirm')) + '</button>',
        size: 'sm'
      });
      m.el.querySelectorAll('[data-x]').forEach(function (b) {
        b.addEventListener('click', function () {
          m.close();
          resolve(b.getAttribute('data-x') === '1');
        });
      });
    });
  }

  function modal(opts) {
    var root = document.getElementById('modalRoot');
    var wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML =
      '<div class="modal-overlay"></div>' +
      '<div class="modal modal-' + (opts.size || 'md') + '" role="dialog" aria-modal="true">' +
      (opts.title !== false ? '<header class="modal-head"><h3>' + esc(opts.title || '') + '</h3><button class="btn-icon modal-x" aria-label="' + esc(I18n.t('close')) + '">' + icon('x', 18) + '</button></header>' : '') +
      '<div class="modal-body"></div>' +
      (opts.footer ? '<footer class="modal-foot">' + opts.footer + '</footer>' : '') +
      '</div>';
    root.appendChild(wrap);
    var bodyEl = wrap.querySelector('.modal-body');
    if (typeof opts.body === 'string') bodyEl.innerHTML = opts.body;
    else if (opts.body) bodyEl.appendChild(opts.body);

    function close() {
      wrap.classList.remove('open');
      setTimeout(function () { wrap.remove(); }, 200);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(function () { wrap.classList.add('open'); });
    wrap.querySelector('.modal-overlay').addEventListener('click', close);
    var x = wrap.querySelector('.modal-x');
    if (x) x.addEventListener('click', close);
    return { el: wrap, body: bodyEl, close: close };
  }

  var lbState = { images: [], index: 0, el: null, scale: 1, tx: 0, ty: 0 };

  function lightboxOpen(images, index) {
    if (!images || !images.length) return;
    var root = document.getElementById('lightboxRoot');
    if (!lbState.el) {
      var el = document.createElement('div');
      el.className = 'lightbox';
      el.innerHTML =
        '<button class="btn-icon lb-btn lb-close" aria-label="close">' + icon('close', 22) + '</button>' +
        '<button class="btn-icon lb-btn lb-prev" aria-label="prev">' + icon('chevron-left', 26) + '</button>' +
        '<img class="lb-img" alt="">' +
        '<video class="lb-video" controls playsinline style="display:none"></video>' +
        '<button class="btn-icon lb-btn lb-next" aria-label="next">' + icon('chevron-right', 26) + '</button>' +
        '<div class="lb-count"></div>';
      root.appendChild(el);
      lbState.el = el;
      el.querySelector('.lb-close').addEventListener('click', lightboxClose);
      el.querySelector('.lb-prev').addEventListener('click', function () { lightboxStep(-1); });
      el.querySelector('.lb-next').addEventListener('click', function () { lightboxStep(1); });
      el.addEventListener('click', function (e) { if (e.target === el) lightboxClose(); });
      document.addEventListener('keydown', function (e) {
        if (!lbState.el || !lbState.el.classList.contains('open')) return;
        if (e.key === 'Escape') lightboxClose();
        var rtl = document.documentElement.dir === 'rtl';
        if (e.key === 'ArrowLeft') lightboxStep(rtl ? 1 : -1);
        if (e.key === 'ArrowRight') lightboxStep(rtl ? -1 : 1);
      });
      attachLightboxGestures(el);
    }
    lbState.images = images;
    lbState.index = index || 0;
    lightboxRender();
    lbState.el.classList.add('open');
    document.body.classList.add('no-scroll');
  }

  function lightboxRender() {
    var el = lbState.el;
    resetZoom();
    var item = lbState.images[lbState.index];
    var isVideo = !!(item && typeof item === 'object' && item.type === 'video');
    var src = item && typeof item === 'object' ? item.src : item;
    var imgEl = el.querySelector('.lb-img');
    var vidEl = el.querySelector('.lb-video');
    if (isVideo) {
      imgEl.style.display = 'none';
      vidEl.style.display = '';
      if (vidEl.getAttribute('src') !== src) vidEl.src = src;
      vidEl.play().catch(function () { });
    } else {
      vidEl.pause();
      vidEl.style.display = 'none';
      vidEl.removeAttribute('src');
      imgEl.style.display = '';
      imgEl.src = src;
    }
    el.querySelector('.lb-count').textContent = (lbState.index + 1) + ' / ' + lbState.images.length;
    var multi = lbState.images.length > 1;
    el.querySelector('.lb-prev').style.display = multi ? '' : 'none';
    el.querySelector('.lb-next').style.display = multi ? '' : 'none';
  }

  function lightboxStep(dir) {
    var n = lbState.images.length;
    lbState.index = (lbState.index + dir + n) % n;
    lightboxRender();
  }

  function lightboxClose() {
    if (!lbState.el) return;
    resetZoom();
    lbState.el.classList.remove('open');
    var vid = lbState.el.querySelector('.lb-video');
    if (vid) { vid.pause(); vid.removeAttribute('src'); }
    document.body.classList.remove('no-scroll');
  }

  /* ---- lightbox: zoom + pan + swipe ---- */

  function lbImgEl() {
    return lbState.el ? lbState.el.querySelector('.lb-img') : null;
  }
  function resetZoom() {
    var img = lbImgEl();
    if (!img) return;
    lbState.scale = 1;
    lbState.tx = 0;
    lbState.ty = 0;
    img.style.transform = '';
    img.style.transformOrigin = 'center';
    img.classList.remove('zoomed', 'dragging');
  }
  function applyZoom() {
    var img = lbImgEl();
    if (!img) return;
    var s = lbState.scale || 1;
    img.classList.toggle('zoomed', s > 1.01);
    img.style.transform = 'translate(' + (lbState.tx || 0) + 'px,' + (lbState.ty || 0) + 'px) scale(' + s + ')';
  }
  function zoomAt(cx, cy, target) {
    var img = lbImgEl();
    if (!img) return;
    var r = img.getBoundingClientRect();
    var ox = r.width ? (cx - r.left) / r.width : 0.5;
    var oy = r.height ? (cy - r.top) / r.height : 0.5;
    lbState.scale = Math.max(1, Math.min(6, target));
    lbState.tx = 0;
    lbState.ty = 0;
    img.style.transformOrigin = (ox * 100) + '% ' + (oy * 100) + '%';
    applyZoom();
  }
  function lbToggleZoom(cx, cy) {
    if ((lbState.scale || 1) > 1.01) resetZoom();
    else zoomAt(cx, cy, 2.5);
  }
  function touchDist(t) {
    return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  }
  function touchMid(t) {
    return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 };
  }

  function attachLightboxGestures(el) {
    var img = el.querySelector('.lb-img');
    var g = { panning: false, pinch: false, startX: 0, startY: 0, tx0: 0, ty0: 0, dist0: 0, scale0: 1, moved: false, lastTap: 0, lastX: 0, lastY: 0 };

    el.addEventListener('wheel', function (ev) {
      if (img.style.display === 'none') return;
      ev.preventDefault();
      var factor = ev.deltaY < 0 ? 1.18 : 1 / 1.18;
      zoomAt(ev.clientX, ev.clientY, (lbState.scale || 1) * factor);
    }, { passive: false });

    el.addEventListener('dblclick', function (ev) {
      if (ev.target !== img) return;
      ev.preventDefault();
      lbToggleZoom(ev.clientX, ev.clientY);
    });

    img.addEventListener('mousedown', function (ev) {
      if ((lbState.scale || 1) <= 1.01) return;
      ev.preventDefault();
      g.panning = true;
      g.startX = ev.clientX;
      g.startY = ev.clientY;
      g.tx0 = lbState.tx || 0;
      g.ty0 = lbState.ty || 0;
      img.classList.add('dragging');
    });
    document.addEventListener('mousemove', function (ev) {
      if (!g.panning) return;
      lbState.tx = g.tx0 + (ev.clientX - g.startX);
      lbState.ty = g.ty0 + (ev.clientY - g.startY);
      applyZoom();
    });
    document.addEventListener('mouseup', function () {
      if (!g.panning) return;
      g.panning = false;
      img.classList.remove('dragging');
    });

    img.addEventListener('touchstart', function (ev) {
      if (ev.touches.length === 2 && img.style.display !== 'none') {
        g.pinch = true;
        g.moved = false;
        g.dist0 = touchDist(ev.touches) || 1;
        g.scale0 = lbState.scale || 1;
        img.classList.add('dragging');
        return;
      }
      if (ev.touches.length === 1) {
        g.startX = ev.touches[0].clientX;
        g.startY = ev.touches[0].clientY;
        g.tx0 = lbState.tx || 0;
        g.ty0 = lbState.ty || 0;
        g.moved = false;
      }
    }, { passive: true });

    img.addEventListener('touchmove', function (ev) {
      if (g.pinch && ev.touches.length === 2) {
        if (ev.cancelable) ev.preventDefault();
        var d = touchDist(ev.touches);
        var mid = touchMid(ev.touches);
        zoomAt(mid.x, mid.y, g.scale0 * (d / (g.dist0 || 1)));
        return;
      }
      if (ev.touches.length === 1 && (lbState.scale || 1) > 1.01) {
        if (ev.cancelable) ev.preventDefault();
        var dx = ev.touches[0].clientX - g.startX;
        var dy = ev.touches[0].clientY - g.startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) g.moved = true;
        lbState.tx = g.tx0 + dx;
        lbState.ty = g.ty0 + dy;
        applyZoom();
      }
    }, { passive: false });

    img.addEventListener('touchend', function (ev) {
      if (g.pinch) {
        g.pinch = false;
        img.classList.remove('dragging');
        if ((lbState.scale || 1) < 1.05) resetZoom();
        return;
      }
      if (ev.touches.length) return;
      var t = ev.changedTouches[0];
      var now = Date.now();
      var zoomed = (lbState.scale || 1) > 1.01;
      var wasTap = !g.moved && !zoomed;
      if (wasTap) {
        var dx = t.clientX - g.startX;
        if (Math.abs(dx) > 50) {
          lightboxStep(dx < 0 ? 1 : -1);
          g.lastTap = 0;
          return;
        }
        if (now - g.lastTap < 320 && Math.abs(t.clientX - g.lastX) < 45 && Math.abs(t.clientY - g.lastY) < 45) {
          lbToggleZoom(t.clientX, t.clientY);
          g.lastTap = 0;
          return;
        }
        g.lastTap = now;
        g.lastX = t.clientX;
        g.lastY = t.clientY;
      }
    });
  }

  function shareLink(url, msg) {
    var text = url || (location.href.split('#')[0]);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast(msg || I18n.t('copied'), 'success');
      }, function () { fallbackCopy(text); });
    } else fallbackCopy(text);
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast(I18n.t('copied'), 'success'); }
    catch (e) { toast(text, 'info'); }
    ta.remove();
  }

  function compressImage(file, maxW, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { resolve(reader.result); };
        img.onload = function () {
          try {
            var w = img.width, h = img.height;
            var scale = Math.min(1, (maxW || 1400) / w);
            var cw = Math.round(w * scale), ch = Math.round(h * scale);
            var canvas = document.createElement('canvas');
            canvas.width = cw; canvas.height = ch;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, cw, ch);
            ctx.drawImage(img, 0, 0, cw, ch);
            var out = canvas.toDataURL('image/jpeg', quality || 0.82);
            if (file.size > 400 * 1024) toast(I18n.t('imageTooBig'), 'info');
            resolve(out);
          } catch (e) { resolve(reader.result); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function readFileDataURL(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function fileSize(bytes) {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function emptyState(iconName, title, sub, actionHtml) {
    return '<div class="empty-state">' +
      '<div class="empty-ic">' + icon(iconName, 30) + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      (sub ? '<p>' + esc(sub) + '</p>' : '') +
      (actionHtml || '') + '</div>';
  }

  /* ---------- مشغّل الفيديو (مشترك بين صفحة الدورة وصفحة الدروس) ---------- */

  /* إعدادات Plyr الموحّدة لكل المشغّلات في الموقع */
  var PLYR_OPTIONS = {
    controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'pip', 'fullscreen'],
    settings: ['speed'],
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
    hideControls: false,
    clickToPlay: true,
    keyboard: { focused: true, global: false },
    tooltips: { controls: true, seek: true },
    youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
  };

  /* رابط الفيديو الخاص بالدرس (يقبل videoUrl و video_url) */
  function videoUrl(ls) {
    if (!ls) return '';
    return String(ls.videoUrl || ls.video_url || ls.video || ls.url || '').trim();
  }

  /* استخراج معرّف فيديو يوتيوب من أي صيغة رابط (watch / youtu.be / embed / shorts / live) */
  function youtubeId(url) {
    if (!url) return '';
    var m = String(url).trim().match(
      /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
    );
    return m ? m[1] : '';
  }

  /* ملف فيديو مباشر (mp4/webm/...) */
  function isDirectVideo(url) {
    return /\.(mp4|webm|ogg|ogv|m4v|mov)(\?|#|$)/i.test(String(url || ''));
  }

  /* رابط تشغيل صالح؟ (يوتيوب أو ملف مباشر) — وإلا فارغ */
  function playableUrl(url) {
    var u = String(url || '').trim();
    if (!u) return '';
    if (youtubeId(u) || isDirectVideo(u)) return u;
    return '';
  }

  /* markup المشغّل: يوتيوب (تضمين) أو ملف فيديو مباشر — بإعدادات Plyr نفسها */
  function playerHTML(url, opts) {
    opts = opts || {};
    var u = playableUrl(url);
    var id = opts.id || 'videoPlayer';
    if (!u) return '';
    if (youtubeId(u)) {
      return '<div class="plyr-host" data-plyr-provider="youtube" data-plyr-embed-id="' +
        esc(youtubeId(u)) + '" id="' + esc(id) + '"></div>';
    }
    return '<video id="' + esc(id) + '" class="plyr-video" playsinline controls preload="none" src="' + esc(u) + '"></video>';
  }

  /* تهيئة Plyr على عنصر (يوتيوب أو ملف مباشر) — تُرجع النسخة أو null */
  function mountPlyr(el, extra) {
    if (!el || !window.Plyr) return null;
    var opts = {};
    Object.keys(PLYR_OPTIONS).forEach(function (k) { opts[k] = PLYR_OPTIONS[k]; });
    if (extra) Object.keys(extra).forEach(function (k) { opts[k] = extra[k]; });
    try {
      return new Plyr(el, opts);
    } catch (err) {
      return null;
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (window.Store) {
      Store.state.ui = Store.state.ui || {};
      Store.state.ui.theme = theme;
      Store.save(true);
    }
    try { localStorage.setItem('dc-theme', theme); } catch (e) { /* ignore */ }
    var b = document.getElementById('uiThemeBtn');
    if (b) b.innerHTML = theme === 'dark' ? icon('sun', 18) : icon('moon', 18);
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setTheme(cur === 'dark' ? 'light' : 'dark');
  }

  function resolveTheme(st) {
    var theme = (st && st.ui && st.ui.theme) || 'light';
    try {
      if (!localStorage.getItem('student_portfolio_v2')) theme = localStorage.getItem('dc-theme') || theme;
    } catch (e) { /* ignore */ }
    return theme;
  }

  function mountTopbar(opts) {
    opts = opts || {};
    var host = document.getElementById('topbarHost');
    if (!host) return;
    host.innerHTML =
      '<header class="topbar"><div class="container topbar-inner">' +
      '<a class="brand" href="' + SITE.u('portfolio') + '">' +
      '<span class="brand-mark"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" fill="#fff"/><path d="M22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></span>' +
      '<span class="brand-name" data-i18n="brand"></span></a>' +
      (opts.search ? '<div class="topbar-search"><span class="ts-ic">' + icon('search', 17) + '</span><input id="globalSearch" type="search" data-i18n-ph="searchPlaceholder" autocomplete="off"></div>' : '') +
      '<div class="topbar-actions">' +
      '<button class="btn-icon" id="uiLangBtn" data-i18n-title="langToggle"><span class="lang-label"></span></button>' +
      '<button class="btn-icon" id="uiThemeBtn" data-i18n-title="themeToggle"></button>' +
      '<button class="btn-icon" id="uiTrBtn" data-i18n-title="translationsBtn">' + icon('languages', 18) + '</button>' +
      (opts.actionHtml || '') +
      '</div></div></header>';

    var theme = resolveTheme(Store.state);
    setTheme(theme);
    I18n.apply();
    var langBtn = host.querySelector('#uiLangBtn');
    langBtn.querySelector('.lang-label').textContent = I18n.t('langToggle');
    langBtn.addEventListener('click', function () {
      I18n.setLang(I18n.getLang() === 'ar' ? 'en' : 'ar');
      langBtn.querySelector('.lang-label').textContent = I18n.t('langToggle');
    });
    host.querySelector('#uiThemeBtn').addEventListener('click', toggleTheme);
    host.querySelector('#uiTrBtn').addEventListener('click', openTranslations);

    var search = host.querySelector('#globalSearch');
    if (search && opts.onSearch) {
      var q = new URLSearchParams(location.search).get('q');
      if (q) search.value = q;
      search.addEventListener('input', debounce(function () { opts.onSearch(search.value.trim()); }, 200));
    }
  }

  function openTranslations() {
    var lang = I18n.getLang();
    var m = modal({
      title: I18n.t('trTitle'),
      size: 'lg',
      body:
        '<p class="tr-desc">' + esc(I18n.t('trDesc')) + '</p>' +
        '<div class="tr-toolbar">' +
        '<input class="input" id="trSearch" placeholder="' + esc(I18n.t('trSearch')) + '">' +
        '<button class="btn btn-ghost" id="trResetAll">' + icon('refresh-cw', 15) + ' ' + esc(I18n.t('trReset')) + '</button>' +
        '</div>' +
        '<div class="tr-list" id="trList"></div>'
    });
    var list = m.body.querySelector('#trList');
    var input = m.body.querySelector('#trSearch');

    function render(filter) {
      var ov = I18n.overrides();
      var keys = I18n.keys().filter(function (k) {
        if (!filter) return true;
        var f = filter.toLowerCase();
        return k.toLowerCase().indexOf(f) >= 0 || String(I18n.base(k)).toLowerCase().indexOf(f) >= 0 || String(ov[k] || '').toLowerCase().indexOf(f) >= 0;
      });
      if (!keys.length) {
        list.innerHTML = '<p class="tr-empty">' + esc(I18n.t('trEmptyResults')) + '</p>';
        return;
      }
      list.innerHTML = keys.map(function (k) {
        var val = ov[k] != null ? ov[k] : I18n.base(k);
        var edited = ov[k] != null;
        return '<div class="tr-row' + (edited ? ' edited' : '') + '" data-key="' + esc(k) + '">' +
          '<div class="tr-meta"><code>' + esc(k) + '</code>' + (edited ? '<span class="tr-dot"></span>' : '') + '</div>' +
          '<div class="tr-original">' + esc(I18n.original(k)) + '</div>' +
          '<input class="input tr-input" value="' + esc(val) + '">' +
          (edited ? '<button class="btn-icon tr-reset" title="' + esc(I18n.t('trResetOne')) + '">' + icon('refresh-cw', 14) + '</button>' : '') +
          '</div>';
      }).join('');
    }
    render('');
    input.addEventListener('input', function () { render(input.value.trim()); });
    list.addEventListener('change', function (e) {
      if (!e.target.classList.contains('tr-input')) return;
      var row = e.target.closest('.tr-row');
      I18n.setOverride(row.getAttribute('data-key'), e.target.value);
      toast(I18n.t('trSaved'), 'success');
      render(input.value.trim());
    });
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('.tr-reset');
      if (!btn) return;
      var row = btn.closest('.tr-row');
      I18n.setOverride(row.getAttribute('data-key'), '');
      render(input.value.trim());
    });
    m.body.querySelector('#trResetAll').addEventListener('click', function () {
      I18n.resetAll();
      toast(I18n.t('trSaved'), 'success');
      render(input.value.trim());
    });
  }

  function emptyLink() { return 'javascript:void(0)'; }

  function init() {
    var st = Store.init();
    var lang = I18n.init();
    document.documentElement.setAttribute('data-theme', resolveTheme(st));
    return lang;
  }

  window.UI = {
    icon: icon,
    iconFilled: iconFilled,
    esc: esc,
    svgURI: svgURI,
    initialsAvatar: initialsAvatar,
    userLetterAvatar: userLetterAvatar,
    avatarOf: avatarOf,
    verifiedBadge: verifiedBadge,
    timeAgo: timeAgo,
    formatDate: formatDate,
    countFmt: countFmt,
    sanitize: sanitize,
    debounce: debounce,
    observeNearViewport: observeNearViewport,
    toast: toast,
    confirm: confirmBox,
    modal: modal,
    lightbox: { open: lightboxOpen, close: lightboxClose, step: lightboxStep },
    shareLink: shareLink,
    compressImage: compressImage,
    readFileDataURL: readFileDataURL,
    fileSize: fileSize,
    emptyState: emptyState,
    videoUrl: videoUrl,
    youtubeId: youtubeId,
    isDirectVideo: isDirectVideo,
    playableUrl: playableUrl,
    playerHTML: playerHTML,
    mountPlyr: mountPlyr,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    mountTopbar: mountTopbar,
    openTranslations: openTranslations,
    init: init,
    emptyLink: emptyLink
  };
})();

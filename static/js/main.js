/* main.js - AnimeFlix full logic (client-side) */
(function () {
  const LS_USERS = 'site_users_v1',
      LS_CUR = 'site_current_user',
      OTP_PREF = 'site_otp_';

function readUsers() {
  return JSON.parse(localStorage.getItem(LS_USERS) || '{}');
}

function writeUsers(u) {
  localStorage.setItem(LS_USERS, JSON.stringify(u));
}

function setCurrent(e) {
  localStorage.setItem(LS_CUR, e);
}

function getCurrent() {
  return localStorage.getItem(LS_CUR);
}  
  async function hashSHA256(text) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const d = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

function toast(msg){
  const t=document.getElementById("toast");
  if(!t) return alert(msg); 
  t.innerText=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),3000);
}


// Splash video handling
const introVideo = document.getElementById("introVideo");

if(introVideo){

introVideo.onended = () => window.location.href = "/login";

  setTimeout(()=>{
    window.location.href="/login";
  }, 7000);

  introVideo.addEventListener("click", ()=>{
    introVideo.muted = false;
    introVideo.volume = 1;
  });
}

  // Flask handles login

  // Flask handles signup

  // Flask handles forgot password



// OTP verify
const otpInputs = document.querySelectorAll('.otp-field');
if (otpInputs && otpInputs.length) {

  otpInputs.forEach((el, i) => {

    // typing (only 1 digit each)
    el.addEventListener('input', e => {
      const v = e.target.value.replace(/\D/g, '').slice(0, 1);
      e.target.value = v;
      if (v && i < otpInputs.length - 1) otpInputs[i + 1].focus();
    });

    // backspace
    el.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) {
        otpInputs[i - 1].focus();
      }
    });

    // paste full OTP support
    el.addEventListener('paste', e => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, otpInputs.length);

      // fill digits
      for (let j = 0; j < pasteData.length && j < otpInputs.length; j++) {
        otpInputs[j].value = pasteData[j];
      }

      // move cursor
      const next = pasteData.length;
      if (next < otpInputs.length) otpInputs[next].focus();
    });
  });
}


const submitOtp = document.getElementById('submitOtp');
if (submitOtp) {
  submitOtp.addEventListener('click', function () {
    const code = Array.from(otpInputs).map(i => i.value.trim()).join('');
    if (code.length !== otpInputs.length) return toast('Enter full OTP');

    const owner = localStorage.getItem('site_last_otp_for');
    const rec = JSON.parse(localStorage.getItem(OTP_PREF + owner) || 'null');

    if (!rec) return toast('No OTP found');
    if (Date.now() > rec.expiresAt) return toast('OTP expired');
    if (rec.otp !== code) return toast('Incorrect OTP');

    localStorage.removeItem(OTP_PREF + owner);
    setCurrent(owner);
    toast('OTP Verified! Continue to set new password.');
    window.location.href = '/reset';
  });
}


// Flask handles password reset

  // Home theme + avatar + signout
  const bodyEl = document.getElementById('homeBody');
  const themeToggle = document.getElementById('themeToggle');
  const profileAvatar = document.getElementById('profileAvatar');
  const signoutBtn = document.getElementById('signoutBtn');

  if (bodyEl) {
    const currentTheme = localStorage.getItem('site_theme') || 'dark';
    if (currentTheme === 'light') bodyEl.classList.add('light');
    const updateIcon = () => {
      themeToggle.textContent = bodyEl.classList.contains('light') ? '🌞' : '🌙';
    };
    updateIcon();

    themeToggle.addEventListener('click', () => {
      themeToggle.classList.add('toggle-spin');
      bodyEl.classList.add('theme-fade');
      setTimeout(() => {
        bodyEl.classList.toggle('light');
        const mode = bodyEl.classList.contains('light') ? 'light' : 'dark';
        localStorage.setItem('site_theme', mode);
        updateIcon();
      }, 250);
      setTimeout(() => {
        themeToggle.classList.remove('toggle-spin');
        bodyEl.classList.remove('theme-fade');
      }, 900);
    });

    if (profileAvatar) {

  profileAvatar.addEventListener('click', () => {

    window.location.href = '/profile';

  });

}
  }
  //  dashboard theme toggle (sync with home)
// ===== DASHBOARD THEME =====

const dashboardBody =
document.getElementById("dashboardBody");

const dashboardThemeBtn =
document.getElementById("themeToggleDashboard");

if (dashboardBody && dashboardThemeBtn) {

  // load saved theme
  const savedTheme =
    localStorage.getItem("site_theme");

  if (savedTheme === "light") {
    dashboardBody.classList.add("light");
  }

  updateDashboardThemeIcon();

  dashboardThemeBtn.addEventListener("click", () => {

    dashboardBody.classList.toggle("light");

    const isLight =
      dashboardBody.classList.contains("light");

    localStorage.setItem(
      "site_theme",
      isLight ? "light" : "dark"
    );

    updateDashboardThemeIcon();

  });

  function updateDashboardThemeIcon() {

    if (dashboardBody.classList.contains("light")) {

      dashboardThemeBtn.innerHTML = "🌞";

    } else {

      dashboardThemeBtn.innerHTML = "🌙";

    }
  }
}
// === Unified Gallery (Search + Filter) ===
const galleryEl = document.getElementById('gallery');
const searchInput = document.getElementById('searchInput');
const filterToggle = document.getElementById('filterToggle');
const filterApply = document.getElementById('filterApply');
const filterReset = document.getElementById('filterReset');
const statusPills = document.querySelectorAll('[data-status]');
const sortPills = document.querySelectorAll('[data-sort]');
const genreChips = document.querySelectorAll('.filter-chip');
const yearStartInput = document.getElementById('yearStart');
const yearEndInput = document.getElementById('yearEnd');

let currentStatus = 'all';       // all | ongoing | completed
let currentSort = 'default';     // default | newest | oldest | az
const selectedGenres = new Set();

function renderGallery(list) {
  galleryEl.innerHTML = '';
  list.forEach(it => {
    const card = document.createElement('article');
    card.className = 'card-thumb';
    card.innerHTML = `

  <div class="anime-card-actions">

    <form method="POST"
          action="/toggle-favorite">

      <input type="hidden"
             name="title"
             value="${it.title}">

      <input type="hidden"
             name="image"
             value="${it.img}">

      <input type="hidden"
             name="link"
             value="${it.link}">

      <button type="submit"
        class="favorite-btn
        ${FAVORITES.includes(it.title)
          ? 'active-favorite'
          : ''}">

        ❤️

      </button>

    </form>

    <form method="POST"
          action="/add-watchlist">

      <input type="hidden"
             name="title"
             value="${it.title}">

      <input type="hidden"
             name="image"
             value="${it.img}">

      <input type="hidden"
             name="link"
             value="${it.link}">

      <button type="submit"
              class="watchlist-btn">

        📌

      </button>

    </form>

  </div>

  <form method="POST"
        action="/add-history"
        class="watch-form">

    <input type="hidden"
           name="title"
           value="${it.title}">

    <input type="hidden"
           name="image"
           value="${it.img}">

    <input type="hidden"
           name="link"
           value="${it.link}">

    <button class="anime-open-btn"
            type="submit"
            style="width:100%;
                   border:0;
                   background:transparent">

      <img src="${it.img}"
           alt="${it.title}">

      <h3>${it.title}</h3>

    </button>

  </form>
`;
    galleryEl.appendChild(card);
  });
}

function applyFilters() {
  if (!galleryEl) return;
  let list = [{
    title: 'One Piece',
    img: '/static/images/one piece.jpg',
    link: 'https://hianime.to/watch/one-piece-100?ep=12351',
    start: 1999,
    end: null,
    ongoing: true,
    genres: ['Action', 'Adventure', 'Fantasy', 'Shounen']
  },
  {
    title: 'Naruto',
    img: '/static/images/naruto.jpg',
    link: 'https://hianime.to/watch/naruto-677?ep=12352',
    start: 2002,
    end: 2007,
    ongoing: false,
    genres: ['Action', 'Adventure', 'Shounen', 'Ninja']
  },
  {
    title: 'Bleach',
    img: '/static/images/bleach.jpg',
    link: 'https://hianime.to/watch/bleach-thousand-year-blood-war-the-separation-18420?ep=102994',
    start: 2004,
    end: 2012,
    ongoing: false,
    genres: ['Action', 'Supernatural', 'Shounen']
  },
  {
    title: 'Attack on Titan',
    img: '/static/images/aot.jpg',
    link: 'https://hianime.to/watch/attack-on-titan-final-season-the-final-chapters-18426?ep=103029',
    start: 2013,
    end: 2023,
    ongoing: false,
    genres: ['Action', 'Drama', 'Fantasy', 'Military']
  },
  {
    title: 'Demon Slayer',
    img: '/static/images/demonslayer.webp',
    link: 'https://hianime.to/watch/demon-slayer-hashira-training-18730?ep=114948',
    start: 2019,
    end: null,
    ongoing: true,
    genres: ['Action', 'Historical', 'Supernatural', 'Shounen']
  },
  {
    title: 'Jujutsu Kaisen',
    img: '/static/images/gojo.webp',
    link: 'https://hianime.to/watch/jujutsu-kaisen-2nd-season-18413?ep=102986',
    start: 2020,
    end: null,
    ongoing: true,
    genres: ['Action', 'Supernatural', 'Dark Fantasy', 'Shounen']
  },
  {
    title: 'Chainsaw Man',
    img: '/static/images/chainsawman.webp',
    link: 'https://hianime.to/watch/chainsaw-man-17406?ep=93754',
    start: 2022,
    end: null,
    ongoing: true,
    genres: ['Action', 'Horror', 'Supernatural', 'Dark Fantasy']
  },
  {
    title: 'Death Note',
    img: '/static/images/deathnote.jpg',
    link: 'https://hianime.to/watch/death-note-60?ep=1467',
    start: 2006,
    end: 2007,
    ongoing: false,
    genres: ['Psychological', 'Thriller', 'Supernatural']
  },
  {
    title: 'My Hero Academia',
    img: '/static/images/mha.jpg',
    link: 'https://hianime.to/watch/my-hero-academia-season-6-17970?ep=95511',
    start: 2016,
    end: 2025,
    ongoing: true,
    genres: ['Action', 'Superhero', 'School', 'Shounen']
  },
  {
    title: 'Tokyo Revengers',
    img: '/static/images/tokyo revengers.webp',
    link: 'https://hianime.to/watch/tokyo-revengers-tenjiku-hen-18626?ep=113353',
    start: 2021,
    end: null,
    ongoing: true,
    genres: ['Action', 'Delinquents', 'Time Travel', 'Drama']
  },
  {
    title: 'Re:Zero',
    img: '/static/images/rezero.jpg',
    link: 'https://hianime.to/watch/rezero-starting-life-in-another-world-422?ep=8942',
    start: 2016,
    end: null,
    ongoing: true,
    genres: ['Isekai', 'Psychological', 'Drama', 'Fantasy']
  },
  {
    title: 'That Time I Got Reincarnated as a Slime',
    img: '/static/images/slime.jpg',
    link: 'https://hianime.to/watch/that-time-i-got-reincarnated-as-a-slime-season-3-19012?ep=121001',
    start: 2018,
    end: null,
    ongoing: true,
    genres: ['Isekai', 'Fantasy', 'Action', 'Comedy']
  },
  {
    title: 'Mushoku Tensei',
    img: '/static/images/mushoku.jpg',
    link: 'https://hianime.to/watch/mushoku-tensei-jobless-reincarnation-season-2-18415?ep=102989',
    start: 2021,
    end: null,
    ongoing: true,
    genres: ['Isekai', 'Fantasy', 'Drama']
  },
  {
    title: 'No Game No Life',
    img: '/static/images/ngnl.jpg',
    link: 'https://hianime.to/watch/no-game-no-life-208?ep=4637',
    start: 2014,
    end: 2014,
    ongoing: false,
    genres: ['Isekai', 'Game', 'Comedy', 'Fantasy']
  },
  {
    title: 'Konosuba',
    img: '/static/images/konosuba.jpg',
    link: 'https://hianime.to/watch/konosuba-an-explosion-on-this-wonderful-world-18416?ep=102991',
    start: 2016,
    end: null,
    ongoing: true,
    genres: ['Isekai', 'Comedy', 'Fantasy', 'Parody']
  },
  {
    title: 'The Rising of the Shield Hero',
    img: '/static/images/shieldhero.jpg',
    link: 'https://hianime.to/watch/the-rising-of-the-shield-hero-season-3-18684?ep=107028',
    start: 2019,
    end: null,
    ongoing: true,
    genres: ['Isekai', 'Fantasy', 'Drama', 'Adventure']
  },
  {
    title: 'Overlord',
    img: '/static/images/overlord.jpg',
    link: 'https://hianime.to/watch/overlord-iv-18077?ep=100392',
    start: 2015,
    end: null,
    ongoing: true,
    genres: ['Isekai', 'Dark Fantasy', 'Action', 'Game']
  },
  {
    title: 'Sword Art Online',
    img: '/static/images/sao.jpg',
    link: 'https://hianime.to/watch/sword-art-online-alicization-war-of-underworld-part-2-13997?ep=35479',
    start: 2012,
    end: null,
    ongoing: true,
    genres: ['Action', 'Romance', 'Game', 'Fantasy']
  },
  {
    title: 'Jobless Reincarnation II',
    img: '/static/images/mushoku2.jpg',
    link: 'https://hianime.to/watch/mushoku-tensei-jobless-reincarnation-season-2-part-2-19068?ep=118116',
    start: 2023,
    end: null,
    ongoing: true,
    genres: ['Isekai', 'Fantasy', 'Drama']
  },
  {
    title: 'Arifureta',
    img: '/static/images/arifureta.jpg',
    link: 'https://hianime.to/watch/arifureta-from-commonplace-to-worlds-strongest-season-2-17789?ep=92902',
    start: 2019,
    end: null,
    ongoing: true,
    genres: ['Isekai', 'Action', 'Fantasy', 'Harem']
  },
  {
    title: 'Solo Leveling',
    img: '/static/images/solo leveling.jpeg',
    link: 'https://hianime.to/watch/solo-leveling-18718?ep=114721',
    start: 2024,
    end: null,
    ongoing: true,
    genres: ['Action', 'Fantasy', 'Hunter', 'System']
  },
  {
    title: 'Black Clover',
    img: '/static/images/black clover.webp',
    link: 'https://hianime.to/watch/black-clover-sword-of-the-wizard-king-18585?ep=106568',
    start: 2017,
    end: 2021,
    ongoing: false,
    genres: ['Action', 'Magic', 'Fantasy', 'Shounen']
  },
  {
    title: 'Boruto: Two Blue Vortex',
    img: '/static/images/boruto.jpg',
    link: 'https://hianime.to/watch/boruto-two-blue-vortex-19428?ep=130028',
    start: 2024,
    end: null,
    ongoing: true,
    genres: ['Action', 'Adventure', 'Ninja', 'Shounen']
  },
  {
    title: 'Kaiju No. 8',
    img: '/static/images/kaiju8.jpg',
    link: 'https://hianime.to/watch/kaiju-no8-19015?ep=119990',
    start: 2024,
    end: null,
    ongoing: true,
    genres: ['Action', 'Sci-Fi', 'Monster', 'Shounen']
  },
  {
    title: 'Wind Breaker',
    img: '/static/images/windbreaker.jpg',
    link: 'https://hianime.to/watch/wind-breaker-19025?ep=119997',
    start: 2024,
    end: null,
    ongoing: true,
    genres: ['Action', 'Delinquents', 'School']
  },
    {
    title:'Cowboy Bebop',
    img:'/static/images/cowboy.jpg',
    link:'https://hianime.to/watch/cowboy-bebop-2083?ep=42199',
    start:1998,
    end:1999,
    ongoing:false,
    genres:['Action','Sci-Fi','Space','Drama']
  },
  {
    title:'Neon Genesis Evangelion',
    img:'/static/images/evangelion.jpg',
    link:'https://hianime.to/watch/neon-genesis-evangelion-428?ep=908',
    start:1995,
    end:1996,
    ongoing:false,
    genres:['Psychological','Mecha','Drama','Sci-Fi']
  },
  {
    title:'Gintama',
    img:'/static/images/gintama.jpg',
    link:'https://hianime.to/watch/gintama-918?ep=30759',
    start:2006,
    end:2018,
    ongoing:false,
    genres:['Comedy','Action','Parody','Samurai','Sci-Fi']
  },
  {
    title:'Psycho-Pass',
    img:'/static/images/psychopass.jpg',
    link:'https://hianime.to/watch/psycho-pass-185?ep=5485',
    start:2012,
    end:null,
    ongoing:true,
    genres:['Psychological','Sci-Fi','Crime','Thriller']
  },
  {
    title:'Black Lagoon',
    img:'/static/images/blacklagoon.jpg',
    link:'https://hianime.to/watch/black-lagoon-372?ep=37499',
    start:2006,
    end:2006,
    ongoing:false,
    genres:['Action','Crime','Seinen']
  },
  {
    title:'Your Lie in April',
    img:'/static/images/yourlie.jpg',
    link:'https://hianime.to/watch/shigatsu-wa-kimi-no-uso-222?ep=39581',
    start:2014,
    end:2015,
    ongoing:false,
    genres:['Drama','Romance','Music','School']
  },
  {
    title:'Clannad',
    img:'/static/images/clannad.jpg',
    link:'https://hianime.to/watch/clannad-292?ep=800',
    start:2007,
    end:2008,
    ongoing:false,
    genres:['Drama','Romance','Slice of Life']
  },
  {
    title:'Violet Evergarden',
    img:'/static/images/violet.jpg',
    link:'https://hianime.to/watch/violet-evergarden-152?ep=38954',
    start:2018,
    end:2018,
    ongoing:false,
    genres:['Drama','Fantasy','Slice of Life']
  },
  {
    title:'Toradora',
    img:'/static/images/toradora.jpg',
    link:'https://hianime.to/watch/toradora-226?ep=38178',
    start:2008,
    end:2009,
    ongoing:false,
    genres:['Romance','Comedy','Drama','School']
  },
  {
    title:'Kaguya-sama: Love is War',
    img:'/static/images/kaguya.jpg',
    link:'https://hianime.to/watch/kaguya-sama-love-is-war-239?ep=45555',
    start:2019,
    end:null,
    ongoing:true,
    genres:['Romance','Comedy','Psychological','School']
  },
  {
    title:'Dororo',
    img:'/static/images/dororo.jpg',
    link:'https://hianime.to/watch/dororo-303?ep=33278',
    start:2019,
    end:2019,
    ongoing:false,
    genres:['Action','Historical','Samurai','Supernatural']
  },
  {
    title:'Monster',
    img:'/static/images/monster.jpg',
    link:'https://hianime.to/watch/monster-34?ep=32819',
    start:2004,
    end:2005,
    ongoing:false,
    genres:['Thriller','Psychological','Mystery','Seinen']
  },
  {
    title:'Parasyte',
    img:'/static/images/parasyte.jpg',
    link:'https://hianime.to/watch/parasyte-the-maxim-228?ep=34219',
    start:2014,
    end:2015,
    ongoing:false,
    genres:['Horror','Sci-Fi','Psychological','Seinen']
  },
  {
    title:'Dragon Ball Z',
    img:'/static/images/dbz.jpg',
    link:'https://hianime.to/watch/dragon-ball-z-253?ep=39353',
    start:1989,
    end:1996,
    ongoing:false,
    genres:['Action','Adventure','Martial Arts','Shounen']
  },
    {
    title:'Haikyuu!!',
    img:'/static/images/haikyuu.jpg',
    link:'https://hianime.to/watch/haikyuu-1966?ep=38763',
    start:2014,
    end:2020,
    ongoing:false,
    genres:['Sports','School','Comedy','Drama']
  },
  {
    title:'Kuroko no Basket',
    img:'/static/images/kuroko.jpg',
    link:'https://hianime.to/watch/kuroko-no-basket-102?ep=41437',
    start:2012,
    end:2015,
    ongoing:false,
    genres:['Sports','School','Shounen']
  },
  {
    title:'Yuri on Ice',
    img:'/static/images/yurionice.jpg',
    link:'https://hianime.to/watch/yuri-on-ice-215?ep=38021',
    start:2016,
    end:2016,
    ongoing:false,
    genres:['Sports','Drama','Slice of Life']
  },
  {
    title:'Hellsing Ultimate',
    img:'/static/images/hellsingultimate.jpg',
    link:'https://hianime.to/watch/hellsing-ultimate-465?ep=11939',
    start:2006,
    end:2012,
    ongoing:false,
    genres:['Horror','Action','Vampire','Seinen']
  },
  {
    title:'Erased',
    img:'/static/images/erased.jpg',
    link:'https://hianime.to/watch/boku-dake-ga-inai-machi-238?ep=12769',
    start:2016,
    end:2016,
    ongoing:false,
    genres:['Mystery','Thriller','Psychological']
  },
  {
    title:'Steins;Gate',
    img:'/static/images/steinsgate.jpg',
    link:'https://hianime.to/watch/steinsgate-227?ep=4783',
    start:2011,
    end:2011,
    ongoing:false,
    genres:['Sci-Fi','Psychological','Time Travel']
  },
  {
    title:'Akira',
    img:'/static/images/akira.jpg',
    link:'https://hianime.to/watch/akira-2924?ep=52889',
    start:1988,
    end:1988,
    ongoing:false,
    genres:['Sci-Fi','Cyberpunk','Action','Thriller']
  },
  {
    title:'Ghost in the Shell',
    img:'/static/images/ghost.jpg',
    link:'https://hianime.to/watch/ghost-in-the-shell-151?ep=2752',
    start:1995,
    end:1995,
    ongoing:false,
    genres:['Sci-Fi','Mystery','Cyberpunk']
  },
  {
    title:'Your Name',
    img:'/static/images/yourname.jpg',
    link:'https://hianime.to/watch/your-name-2016-181?ep=27352',
    start:2016,
    end:2016,
    ongoing:false,
    genres:['Romance','Drama','Supernatural']
  },
  {
    title:'Weathering with You',
    img:'/static/images/weathering.jpg',
    link:'https://hianime.to/watch/weathering-with-you-2062?ep=56750',
    start:2019,
    end:2019,
    ongoing:false,
    genres:['Romance','Drama','Supernatural']
  },
  {
    title:'The Girl Who Leapt Through Time',
    img:'/static/images/timegirl.jpg',
    link:'https://hianime.to/watch/the-girl-who-leapt-through-time-51?ep=8879',
    start:2006,
    end:2006,
    ongoing:false,
    genres:['Drama','Sci-Fi','Romance','Time Travel']
  },
  {
    title:'Perfect Blue',
    img:'/static/images/perfectblue.jpg',
    link:'https://hianime.to/watch/perfect-blue-3036?ep=47055',
    start:1997,
    end:1997,
    ongoing:false,
    genres:['Psychological','Thriller','Drama']
  },
  {
    title:'Paprika',
    img:'/static/images/paprika.jpg',
    link:'https://hianime.to/watch/paprika-6261?ep=50899',
    start:2006,
    end:2006,
    ongoing:false,
    genres:['Sci-Fi','Psychological','Thriller']
  },
  {
    title:'Slam Dunk',
    img:'/static/images/slamdunk.jpg',
    link:'https://hianime.to/watch/slam-dunk-movie-2022-18212?ep=102393',
    start:1993,
    end:1996,
    ongoing:false,
    genres:['Sports','School','Shounen']
  },
  {
    title:'Prince of Tennis',
    img:'/static/images/tennis.jpg',
    link:'https://hianime.to/watch/the-prince-of-tennis-152?ep=49408',
    start:2001,
    end:2005,
    ongoing:false,
    genres:['Sports','School','Competition','Shounen']
  },
  {
    title:'Dororo',
    img:'/static/images/dororo.jpg',
    link:'https://hianime.to/watch/dororo-303?ep=33278',
    start:2019,
    end:2019,
    ongoing:false,
    genres:['Action','Historical','Supernatural']
  },
  {
    title:'Major',
    img:'/static/images/major.jpg',
    link:'https://hianime.to/watch/major-258?ep=30726',
    start:2004,
    end:2010,
    ongoing:false,
    genres:['Sports','Drama','Shounen']
  },
  {
    title:'Eyeshield 21',
    img:'/static/images/eyeshield.jpg',
    link:'https://hianime.to/watch/eyeshield-21-1214?ep=35544',
    start:2005,
    end:2008,
    ongoing:false,
    genres:['Sports','Comedy','School','Shounen']
  },
  {
    title:'Hajime no Ippo',
    img:'/static/images/ippo.jpg',
    link:'https://hianime.to/watch/hajime-no-ippo-589?ep=55523',
    start:2000,
    end:null,
    ongoing:true,
    genres:['Sports','Boxing','Shounen','Drama']
  },
    {
    title:'Made in Abyss',
    img:'/static/images/madeinabyss.jpg',
    link:'https://hianime.to/watch/made-in-abyss-40?ep=32986',
    start:2017,
    end:null,
    ongoing:true,
    genres:['Adventure','Fantasy','Drama','Mystery']
  },
  {
    title:'Fate/Zero',
    img:'/static/images/fatezero.jpg',
    link:'https://hianime.to/watch/fate-zero-137?ep=1487',
    start:2011,
    end:2012,
    ongoing:false,
    genres:['Action','Fantasy','Supernatural']
  },
  {
    title:'The Ancient Magus Bride',
    img:'/static/images/magusbride.jpg',
    link:'https://hianime.to/watch/mahoutsukai-no-yome-season-2-18432?ep=103028',
    start:2017,
    end:null,
    ongoing:true,
    genres:['Fantasy','Romance','Supernatural','Drama']
  },
  {
    title:'Log Horizon',
    img:'/static/images/loghorizon.jpg',
    link:'https://hianime.to/watch/log-horizon-285?ep=8357',
    start:2013,
    end:2021,
    ongoing:false,
    genres:['Fantasy','Game','Adventure']
  },
  {
    title:'Grimgar of Fantasy and Ash',
    img:'/static/images/grimgar.jpg',
    link:'https://hianime.to/watch/grimgar-of-fantasy-and-ash-814?ep=38898',
    start:2016,
    end:2016,
    ongoing:false,
    genres:['Fantasy','Drama','Adventure']
  },
  {
    title:'The Devil is a Part Timer',
    img:'/static/images/devilparttimer.jpg',
    link:'https://hianime.to/watch/the-devil-is-a-part-timer-season-2-17978?ep=95555',
    start:2013,
    end:null,
    ongoing:true,
    genres:['Comedy','Fantasy','Isekai']
  },
  {
    title:'The Faraway Paladin',
    img:'/static/images/farawaypaladin.jpg',
    link:'https://hianime.to/watch/the-faraway-paladin-season-2-18697?ep=106867',
    start:2021,
    end:null,
    ongoing:true,
    genres:['Adventure','Fantasy','Drama']
  },
  {
    title:'Saga of Tanya the Evil',
    img:'/static/images/tanya.jpg',
    link:'https://hianime.to/watch/saga-of-tanya-the-evil-182?ep=8071',
    start:2017,
    end:null,
    ongoing:true,
    genres:['Military','Fantasy','Isekai']
  },
  {
    title:'How a Realist Hero Rebuilt the Kingdom',
    img:'/static/images/realist.jpg',
    link:'https://hianime.to/watch/how-a-realist-hero-rebuilt-the-kingdom-18156?ep=36379',
    start:2021,
    end:null,
    ongoing:true,
    genres:['Fantasy','Drama','Romance','Isekai']
  },
  {
    title:'Ascendance of a Bookworm',
    img:'/static/images/bookworm.jpg',
    link:'https://hianime.to/watch/ascendance-of-a-bookworm-427?ep=38916',
    start:2019,
    end:null,
    ongoing:true,
    genres:['Fantasy','Isekai','Slice of Life']
  },
  {
    title:'So I’m a Spider, So What?',
    img:'/static/images/spider.jpg',
    link:'https://hianime.to/watch/kumo-desu-ga-nani-ka-15709?ep=84903',
    start:2021,
    end:2021,
    ongoing:false,
    genres:['Fantasy','Isekai','Action']
  },
  {
    title:'BOFURI',
    img:'/static/images/bofuri.jpg',
    link:'https://hianime.to/watch/bofuri-season-2-18518?ep=99673',
    start:2020,
    end:null,
    ongoing:true,
    genres:['Game','Comedy','Fantasy']
  },
  {
    title:'Plunderer',
    img:'/static/images/plunderer.jpg',
    link:'https://hianime.to/watch/plunderer-17717?ep=88247',
    start:2020,
    end:null,
    ongoing:true,
    genres:['Action','Fantasy','Adventure']
  },
  {
    title:'The Eminence in Shadow',
    img:'/static/images/eminence.jpg',
    link:'https://hianime.to/watch/the-eminence-in-shadow-18412?ep=102347',
    start:2022,
    end:null,
    ongoing:true,
    genres:['Action','Comedy','Fantasy','Isekai']
  },
  {
    title:'Sword Art Online Alternative: Gun Gale Online',
    img:'/static/images/gungale.jpg',
    link:'https://hianime.to/watch/sword-art-online-alternative-gun-gale-online-320?ep=35374',
    start:2018,
    end:2018,
    ongoing:false,
    genres:['Action','Sci-Fi','Game']
  },
  {
    title:'Gate',
    img:'/static/images/gate.jpg',
    link:'https://hianime.to/watch/gate-185?ep=23968',
    start:2015,
    end:2016,
    ongoing:false,
    genres:['Fantasy','Military','Adventure']
  },
    {
    title:'Fire Force',
    img:'/static/images/fireforce.jpg',
    link:'https://hianime.to/watch/fire-force-1851?ep=43975',
    start:2019,
    end:null,
    ongoing:true,
    genres:['Action','Supernatural','Shounen']
  },
  {
    title:'Blue Exorcist',
    img:'/static/images/blueexorcist.jpg',
    link:'https://hianime.to/watch/blue-exorcist-392?ep=36597',
    start:2011,
    end:null,
    ongoing:true,
    genres:['Action','Supernatural','Shounen']
  },
  {
    title:'Seraph of the End',
    img:'/static/images/seraph.jpg',
    link:'https://hianime.to/watch/seraph-of-the-end-231?ep=2852',
    start:2015,
    end:null,
    ongoing:true,
    genres:['Action','Supernatural','Vampire']
  },
  {
    title:'Claymore',
    img:'/static/images/claymore.jpg',
    link:'https://hianime.to/watch/claymore-180?ep=37801',
    start:2007,
    end:2007,
    ongoing:false,
    genres:['Action','Supernatural','Fantasy']
  },
  {
    title:'Soul Eater',
    img:'/static/images/souleater.jpg',
    link:'https://hianime.to/watch/soul-eater-146?ep=40949',
    start:2008,
    end:2009,
    ongoing:false,
    genres:['Action','Supernatural','Comedy','Shounen']
  },
  {
    title:'Fairy Tail',
    img:'/static/images/fairytail.jpg',
    link:'https://hianime.to/watch/fairy-tail-263?ep=34778',
    start:2009,
    end:null,
    ongoing:true,
    genres:['Fantasy','Adventure','Magic','Shounen']
  },
  {
    title:'Magi: The Labyrinth of Magic',
    img:'/static/images/magi.jpg',
    link:'https://hianime.to/watch/magi-the-labyrinth-of-magic-449?ep=2659',
    start:2012,
    end:null,
    ongoing:true,
    genres:['Fantasy','Adventure','Magic','Shounen']
  },
  {
    title:'Akame ga Kill!',
    img:'/static/images/akame.jpg',
    link:'https://hianime.to/watch/akame-ga-kill-180?ep=7257',
    start:2014,
    end:2014,
    ongoing:false,
    genres:['Action','Drama','Fantasy']
  },
  {
    title:'Kill la Kill',
    img:'/static/images/killlakill.jpg',
    link:'https://hianime.to/watch/kill-la-kill-205?ep=64538',
    start:2013,
    end:2014,
    ongoing:false,
    genres:['Action','Comedy','School']
  },
  {
    title:'Black Bullet',
    img:'/static/images/blackbullet.jpg',
    link:'https://hianime.to/watch/black-bullet-353?ep=40810',
    start:2014,
    end:2014,
    ongoing:false,
    genres:['Action','Sci-Fi','Supernatural']
  },
  {
    title:'Durarara!!',
    img:'/static/images/durarara.jpg',
    link:'https://hianime.to/watch/durarara-305?ep=8244',
    start:2010,
    end:2016,
    ongoing:false,
    genres:['Action','Mystery','Supernatural']
  },
  {
    title:'Charlotte',
    img:'/static/images/charlotte.jpg',
    link:'https://hianime.to/watch/charlotte-1226?ep=35488',
    start:2015,
    end:2015,
    ongoing:false,
    genres:['Drama','Supernatural','School']
  },
  {
    title:'Angels of Death',
    img:'/static/images/angelsdeath.jpg',
    link:'https://hianime.to/watch/angels-of-death-20803?ep=93763',
    start:2018,
    end:2018,
    ongoing:false,
    genres:['Psychological','Horror','Thriller']
  },
  {
    title:'Terror in Resonance',
    img:'/static/images/terror.jpg',
    link:'https://hianime.to/watch/terror-in-resonance-414?ep=29693',
    start:2014,
    end:2014,
    ongoing:false,
    genres:['Psychological','Thriller']
  },
  {
    title:'Jin-Roh: The Wolf Brigade',
    img:'/static/images/jinroh.jpg',
    link:'https://hianime.to/watch/jin-roh-the-wolf-brigade-3318?ep=50432',
    start:1999,
    end:1999,
    ongoing:false,
    genres:['Drama','Military','Psychological']
  },
  {
    title:'Danganronpa',
    img:'/static/images/dangan.jpg',
    link:'https://hianime.to/watch/danganronpa-the-animation-189?ep=26951',
    start:2013,
    end:null,
    ongoing:true,
    genres:['Mystery','Psychological','Thriller']
  },
    {
    title:'Tokyo Ghoul',
    img:'/static/images/tokyoghoul.jpg',
    link:'https://hianime.to/watch/tokyo-ghoul-804?ep=76594',
    start:2014,
    end:2018,
    ongoing:false,
    genres:['Action','Horror','Supernatural','Seinen']
  },
  {
    title:'Elfen Lied',
    img:'/static/images/elfenlied.jpg',
    link:'https://hianime.to/watch/elfen-lied-155?ep=35637',
    start:2004,
    end:2004,
    ongoing:false,
    genres:['Horror','Psychological','Drama']
  },
  {
    title:'Another',
    img:'/static/images/another.jpg',
    link:'https://hianime.to/watch/another-24?ep=38253',
    start:2012,
    end:2012,
    ongoing:false,
    genres:['Horror','Mystery','School']
  },
  {
    title:'Death Parade',
    img:'/static/images/deathparade.jpg',
    link:'https://hianime.to/watch/death-parade-241?ep=46296',
    start:2015,
    end:2015,
    ongoing:false,
    genres:['Psychological','Drama','Supernatural']
  },
  {
    title:'Texhnolyze',
    img:'/static/images/texhnolyze.jpg',
    link:'https://hianime.to/watch/texhnolyze-101?ep=35233',
    start:2003,
    end:2003,
    ongoing:false,
    genres:['Sci-Fi','Cyberpunk','Psychological']
  },
  {
    title:'Serial Experiments Lain',
    img:'/static/images/lain.jpg',
    link:'https://hianime.to/watch/serial-experiments-lain-250?ep=34081',
    start:1998,
    end:1998,
    ongoing:false,
    genres:['Cyberpunk','Psychological','Sci-Fi']
  },
  {
    title:'Neon Genesis Evangelion: The End of Evangelion',
    img:'/static/images/eoe.jpg',
    link:'https://hianime.to/watch/the-end-of-evangelion-236?ep=4307',
    start:1997,
    end:1997,
    ongoing:false,
    genres:['Psychological','Sci-Fi','Drama']
  },
  {
    title:'Wolf Children',
    img:'/static/images/wolfchildren.jpg',
    link:'https://hianime.to/watch/wolf-children-29?ep=25332',
    start:2012,
    end:2012,
    ongoing:false,
    genres:['Drama','Fantasy','Romance']
  },
  {
    title:'5 Centimeters Per Second',
    img:'/static/images/5cm.jpg',
    link:'https://hianime.to/watch/5-centimeters-per-second-205?ep=46195',
    start:2007,
    end:2007,
    ongoing:false,
    genres:['Romance','Drama','Slice of Life']
  },
  {
    title:'A Silent Voice',
    img:'/static/images/silentvoice.jpg',
    link:'https://hianime.to/watch/a-silent-voice-2016-233?ep=43482',
    start:2016,
    end:2016,
    ongoing:false,
    genres:['Drama','Romance','School']
  },
  {
    title:'The Wind Rises',
    img:'/static/images/windrises.jpg',
    link:'https://hianime.to/watch/the-wind-rises-2339?ep=60111',
    start:2013,
    end:2013,
    ongoing:false,
    genres:['Drama','Historical']
  },
  {
    title:'Princess Mononoke',
    img:'/static/images/mononoke.jpg',
    link:'https://hianime.to/watch/princess-mononoke-134?ep=34005',
    start:1997,
    end:1997,
    ongoing:false,
    genres:['Fantasy','Adventure','Historical']
  },
  {
    title:'Spirited Away',
    img:'/static/images/spiritedaway.jpg',
    link:'https://hianime.to/watch/spirited-away-551?ep=33699',
    start:2001,
    end:2001,
    ongoing:false,
    genres:['Fantasy','Adventure','Supernatural']
  },
  {
    title:'Howl’s Moving Castle',
    img:'/static/images/howl.jpg',
    link:'https://hianime.to/watch/howls-moving-castle-166?ep=48753',
    start:2004,
    end:2004,
    ongoing:false,
    genres:['Fantasy','Romance','Adventure']
  },
  {
    title:'The Garden of Words',
    img:'/static/images/gardenwords.jpg',
    link:'https://hianime.to/watch/the-garden-of-words-257?ep=43487',
    start:2013,
    end:2013,
    ongoing:false,
    genres:['Romance','Drama','Slice of Life']
  }];

  // text search
  const q = (searchInput?.value || '').trim().toLowerCase();
  if (q) {
    list = list.filter(a => a.title.toLowerCase().includes(q));
  }

  // status
  if (currentStatus === 'ongoing') {
    list = list.filter(a => a.ongoing);
  } else if (currentStatus === 'completed') {
    list = list.filter(a => !a.ongoing);
  }

  // year range
  const ys = parseInt(yearStartInput?.value || '', 10);
  const ye = parseInt(yearEndInput?.value || '', 10);
  if (!isNaN(ys)) {
    list = list.filter(a => a.start >= ys);
  }
  if (!isNaN(ye)) {
    list = list.filter(a => {
      const lastYear = a.end || a.start;
      return lastYear <= ye;
    });
  }

  // genres
  if (selectedGenres.size) {
    list = list.filter(a => {
      if (!a.genres) return false;
      const lower = a.genres.map(g => g.toLowerCase());
      for (const g of selectedGenres) {
        if (lower.some(x => x.includes(g))) return true;
      }
      return false;
    });
  }

  // sort
  if (currentSort === 'newest') {
    list.sort((a,b) => (b.start || 0) - (a.start || 0));
  } else if (currentSort === 'oldest') {
    list.sort((a,b) => (a.start || 0) - (b.start || 0));
  } else if (currentSort === 'az') {
    list.sort((a,b) => a.title.localeCompare(b.title));
  } else {
    // default: random-ish but stable enough
    list.sort((a,b) => a.title.localeCompare(b.title));
  }

  renderGallery(list);
}

if (galleryEl) {
  applyFilters(); // initial render

  // search live filter
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  // filter overlay open/close
const filterToggle = document.getElementById('filterToggle');
const filterSection = document.getElementById('filterSection');

if(filterToggle && filterSection){

  filterToggle.addEventListener('click', ()=>{

    filterSection.classList.toggle('open');

  });

}
  // status pills
  statusPills.forEach(btn => {
    btn.addEventListener('click', () => {
      statusPills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatus = btn.dataset.status || 'all';
      applyFilters();
    });
  });

  // sort pills
  sortPills.forEach(btn => {
    btn.addEventListener('click', () => {
      sortPills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSort = btn.dataset.sort || 'default';
      applyFilters();
    });
  });

  // genre chips
  genreChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const g = chip.dataset.genre;
      if (!g) return;
      if (chip.classList.contains('active')) {
        chip.classList.remove('active');
        selectedGenres.delete(g);
      } else {
        chip.classList.add('active');
        selectedGenres.add(g);
      }
      applyFilters();
    });
  });

  // apply + reset buttons
  if (filterApply) {
    filterApply.addEventListener('click', () => {
      filterOverlay.classList.remove('open');
      applyFilters();
    });
  }
  if (filterReset) {
    filterReset.addEventListener('click', () => {
      // reset state
      currentStatus = 'all';
      currentSort = 'default';
      selectedGenres.clear();
      if (yearStartInput) yearStartInput.value = '';
      if (yearEndInput) yearEndInput.value = '';
      statusPills.forEach(b => b.classList.toggle('active', b.dataset.status === 'all'));
      sortPills.forEach(b => b.classList.toggle('active', b.dataset.sort === 'default'));
      genreChips.forEach(c => c.classList.remove('active'));
      applyFilters();
    });
  }
}


  // === Gallery Page Theme ===
  const galleryBody = document.getElementById('galleryBody');
  const themeToggleGallery = document.getElementById('themeToggleGallery');

  if (galleryBody && themeToggleGallery) {
    const currentTheme = localStorage.getItem('site_theme') || 'dark';
    if (currentTheme === 'light') galleryBody.classList.add('light');

    const updateGalleryIcon = () => {
      themeToggleGallery.textContent = galleryBody.classList.contains('light') ? '🌞' : '🌙';
    };
    updateGalleryIcon();

    themeToggleGallery.addEventListener('click', () => {
      themeToggleGallery.classList.add('toggle-spin');
      galleryBody.classList.add('theme-fade');
      setTimeout(() => {
        galleryBody.classList.toggle('light');
        const mode = galleryBody.classList.contains('light') ? 'light' : 'dark';
        localStorage.setItem('site_theme', mode);
        updateGalleryIcon();
      }, 250);
      setTimeout(() => {
        themeToggleGallery.classList.remove('toggle-spin');
        galleryBody.classList.remove('theme-fade');
      }, 900);
    });
  }

  // Player
  const videoEl = document.getElementById('videoEl');
  if (videoEl) {
    const src = localStorage.getItem('site_player_src');
    const title = localStorage.getItem('site_player_title') || 'Player';
    document.getElementById('playerTitle').textContent = title;
    if (src) {
      const s = document.createElement('source');
      s.src = src;
      s.type = 'video/mp4';
      videoEl.appendChild(s);
      videoEl.load();
      videoEl.play().catch(() => {});
    }
  }
})();
/* PASSWORD TOGGLE */

const toggles = document.querySelectorAll(".passToggle");

toggles.forEach(toggle => {

  toggle.addEventListener("click", () => {

    const input = toggle.previousElementSibling;

    const icon = toggle.querySelector("i");

    if (input.type === "password") {

      input.type = "text";

      icon.classList.remove("fa-eye");

      icon.classList.add("fa-eye-slash");

    } else {

      input.type = "password";

      icon.classList.remove("fa-eye-slash");

      icon.classList.add("fa-eye");

    }

  });

});

/* =========================
   FORM VALIDATION
========================= */

function setError(input, message){

  input.classList.add("inputError");
  input.classList.remove("inputSuccess");

  const error =
    input.parentElement.nextElementSibling ||
    input.nextElementSibling;

  if(error){
    error.textContent = message;
  }
}

function setSuccess(input){

  input.classList.remove("inputError");
  input.classList.add("inputSuccess");

  const error =
    input.parentElement.nextElementSibling ||
    input.nextElementSibling;

  if(error){
    error.textContent = "";
  }
}

/* ===== EMAIL ===== */

function validEmail(email){

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

}

/* =========================
   SIGNUP VALIDATION
========================= */

const signupName = document.getElementById("signupName");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const strengthBar = document.getElementById("strengthBar");

if(signupName){

  signupName.addEventListener("input", ()=>{

    if(signupName.value.trim().length < 3){

      setError(signupName, "Minimum 3 characters");

    } else {

      setSuccess(signupName);

    }

  });

}

if(signupEmail){

  signupEmail.addEventListener("input", ()=>{

    if(!validEmail(signupEmail.value.trim())){

      setError(signupEmail, "Invalid email address");

    } else {

      setSuccess(signupEmail);

    }

  });

}

if(signupPassword){

  signupPassword.addEventListener("input", ()=>{

    const val = signupPassword.value;

    let strength = 0;

    if(val.length >= 6) strength++;
    if(/[A-Z]/.test(val)) strength++;
    if(/[0-9]/.test(val)) strength++;
    if(/[^A-Za-z0-9]/.test(val)) strength++;

    if(val.length < 6){

      setError(signupPassword, "Password too short");

    } else {

      setSuccess(signupPassword);

    }

    const widths = ["0%", "25%", "50%", "75%", "100%"];

    strengthBar.style.width = widths[strength];

    if(strength <= 1){

      strengthBar.style.background = "#ff4d6d";

    } else if(strength <= 3){

      strengthBar.style.background = "#f59e0b";

    } else {

      strengthBar.style.background = "#22c55e";

    }

  });

}

/* =========================
   LOGIN VALIDATION
========================= */

const loginIdentifier =
  document.getElementById("loginIdentifier");

const loginPassword =
  document.getElementById("loginPassword");

if(loginIdentifier){

  loginIdentifier.addEventListener("input", ()=>{

    if(loginIdentifier.value.trim().length < 3){

      setError(loginIdentifier, "Enter valid email or username");

    } else {

      setSuccess(loginIdentifier);

    }

  });

}

if(loginPassword){

  loginPassword.addEventListener("input", ()=>{

    if(loginPassword.value.length < 6){

      setError(loginPassword, "Password too short");

    } else {

      setSuccess(loginPassword);

    }

  });

}
export const fallbackStyles = `
html,body{margin:0;padding:0}
body{min-height:100vh;background:linear-gradient(180deg,#f1f6ff 0%,#e8eef8 100%);color:#132238;font-family:"SF Pro Text","PingFang SC","Helvetica Neue",sans-serif;font-size:1rem;line-height:1.68}
*{box-sizing:border-box}
a{text-decoration:none;color:inherit}
button,input,textarea{font:inherit}
button{cursor:pointer;border:0;background:none}
input,textarea{width:100%;padding:.95rem 1rem;border:1px solid rgba(255,255,255,.6);border-radius:14px;background:rgba(248,251,255,.8);color:#132238}
.site-shell{width:min(1480px,calc(100% - 32px));margin:0 auto;padding:24px 0 40px;position:relative;z-index:1}
.ambient{position:fixed;z-index:0;width:34rem;height:34rem;border-radius:50%;filter:blur(68px);opacity:.72;pointer-events:none}
.ambient--one{top:-10rem;left:-8rem;background:rgba(255,214,168,.24)}
.ambient--two{right:-10rem;bottom:-8rem;background:rgba(118,214,255,.2)}
.site-header,.left-rail,.project-sidebar,.writing-index,.writing-sidebar,.wizard-steps,.hero-card,.content-card,.project-card,.form-card,.progress-card,.capability-board__card{background:rgba(255,255,255,.66);border:1px solid rgba(255,255,255,.58);border-radius:28px;box-shadow:0 24px 60px rgba(61,92,138,.12);backdrop-filter:blur(16px)}
.site-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1rem 1.2rem;margin-bottom:1rem}
.site-header__copy{display:grid;gap:.25rem}
.site-header__right,.site-header__tools,.status-lights,.button-row,.hero-actions,.project-card__meta,.project-card__footer,.card-heading,.project-hero,.grid-header,.line-item__head,.outline-item__head{display:flex;gap:.8rem;align-items:center}
.site-header__panel{display:flex;gap:1rem;align-items:flex-start;justify-content:flex-end;flex-wrap:wrap}
.card-heading,.project-hero,.grid-header{justify-content:space-between}
.card-heading--stack{flex-direction:column;align-items:flex-start}
.site-header__right{justify-content:flex-end;flex-wrap:wrap}
.brand{display:inline-block;font-size:clamp(1.95rem,3.4vw,2.9rem);font-weight:700;line-height:.98;letter-spacing:-.05em}
.brand-subtitle{margin:.4rem 0 0;color:#60738d;font-size:.86rem}
.status-lights{padding:.45rem .6rem;border-radius:999px;border:1px solid rgba(255,255,255,.6);background:rgba(255,255,255,.8)}
.status-light{display:inline-flex;align-items:center;gap:.4rem;color:#60738d;font-size:.84rem;font-weight:600}
.status-light__dot{width:10px;height:10px;border-radius:999px;box-shadow:0 0 0 2px rgba(255,255,255,.75)}
.status-light__dot--online{background:#34c759}
.status-light__dot--offline{background:#ff453a}
.ghost-chip,.status-badge{display:inline-flex;align-items:center;justify-content:center;min-height:2rem;padding:.45rem .85rem;border-radius:999px;border:1px solid rgba(255,255,255,.6);background:rgba(255,255,255,.8);font-size:.86rem;font-weight:600}
.ghost-chip--accent,.status-badge.amber{color:#2d6cff}
.status-badge.sage{color:#36a18e}
.status-badge.rose{color:#ef889f}
.status-badge.default{color:#35537e}
.landing-layout,.home-page,.project-layout,.wizard-layout,.writing-layout,.outline-layout,.project-page-grid,.project-grid,.capability-board,.hero-stats,.metric-grid,.progress-card,.form-grid,.chapter-studio{display:grid;gap:1.25rem}
.landing-layout,.project-layout{grid-template-columns:300px minmax(0,1fr)}
.wizard-layout{grid-template-columns:220px minmax(0,1fr)}
.writing-layout{grid-template-columns:280px minmax(0,1fr) 320px}
.outline-layout{grid-template-columns:1.15fr .85fr}
.project-page-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.project-grid,.capability-board{grid-template-columns:repeat(3,minmax(0,1fr))}
.hero-stats,.metric-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.progress-card{grid-template-columns:repeat(5,minmax(0,1fr))}
.chapter-studio{grid-template-columns:300px minmax(0,1fr)}
.left-rail,.project-sidebar,.writing-index,.writing-sidebar,.wizard-steps,.form-card,.content-card,.progress-card{padding:1.25rem}
.hero-panel,.project-main,.home-page,.single-panel-page,.stack-list,.risk-list,.outline-list,.capability-list,.workbench-stack,.chapter-menu,.chapter-panel{display:grid;gap:1rem}
.hero-card{padding:2rem;min-height:340px;display:flex;flex-direction:column;justify-content:flex-end;background:linear-gradient(135deg,rgba(255,255,255,.92),rgba(225,234,248,.72))}
.content-card--accent{background:radial-gradient(circle at 88% 14%,rgba(126,184,255,.18),transparent 22%),linear-gradient(180deg,rgba(255,255,255,.58),rgba(241,247,255,.28)),rgba(255,255,255,.66)}
.hero-card h1,.page-intro h1,.sidebar-project h1,.project-summary h1,.project-hero h2,.content-card h3,.form-card h2,.content-card h4{text-wrap:balance}
.hero-card h1{margin:.35rem 0 0;font-size:clamp(2.28rem,4.4vw,3.5rem);line-height:1.08;letter-spacing:-.04em;max-width:13ch}
.page-intro h1,.sidebar-project h1,.project-summary h1{margin:.35rem 0 0;font-size:clamp(1.72rem,2.4vw,2.28rem);line-height:1.12;letter-spacing:-.04em}
.project-summary h1{font-size:clamp(1.42rem,3vw,1.78rem);line-height:1.06;letter-spacing:-.035em}
.project-hero h2{margin:.35rem 0 0;font-size:clamp(1.72rem,2.4vw,2.28rem);line-height:1.12;letter-spacing:-.04em}
.content-card h3,.form-card h2{margin:.35rem 0 0;font-size:clamp(1.34rem,1.7vw,1.72rem);line-height:1.18;letter-spacing:-.04em}
.content-card h4{margin:.35rem 0 0;font-size:1rem;line-height:1.4;letter-spacing:-.02em}
.hero-card p,.page-intro p,.lead-text,.content-card p,.content-card li,.line-item span,.project-card p{color:#60738d;font-size:1rem;line-height:1.68}
.eyebrow,.rail-label{display:inline-block;text-transform:uppercase;letter-spacing:.16em;font-size:.74rem;font-weight:700;color:#60738d}
.hero-plaque,.rail-links a,.project-nav__item,.sidebar-home,.wizard-step,.line-item,.risk-item,.candidate-card,.outline-item,.metric-card,.capability-item,.hint-panel,.section-ribbon,.choice-card,.chapter-menu__item{background:rgba(255,255,255,.76);border:1px solid rgba(255,255,255,.6);border-radius:18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
.hero-plaque,.rail-links a,.project-nav__item,.sidebar-home,.primary-button,.secondary-button{padding:.85rem 1rem;border-radius:999px}
.primary-button{background:#2d6cff;color:#fff}
.secondary-button{background:rgba(255,255,255,.8);color:#132238;border:1px solid rgba(255,255,255,.6)}
.project-card{padding:1.2rem;display:grid;gap:1rem}
.project-card h3,.choice-card__title{margin:0;font-size:clamp(1rem,1.5vw,1.14rem);font-weight:700;line-height:1.32}
.grid-header h2{margin:.4rem 0 0;font-size:clamp(1.52rem,2.2vw,1.95rem);line-height:1.14;letter-spacing:-.03em}
.grid-header p{max-width:34ch}
.helper-banner{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem;border-radius:24px;background:rgba(255,255,255,.76);border:1px solid rgba(255,255,255,.58)}
.project-summary p{font-size:.94rem}
.field{display:grid;gap:.55rem}
.field--full{grid-column:1 / -1}
.progress-strip{display:grid;gap:.5rem}
.progress-strip__head{display:flex;justify-content:space-between;color:#60738d;font-size:.86rem}
.progress-strip__track{height:8px;border-radius:999px;background:rgba(113,139,176,.12);overflow:hidden}
.progress-strip__fill{height:100%;background:linear-gradient(90deg,#4f87ff,#71d9e5)}
.outline-item{display:grid;grid-template-columns:60px minmax(0,1fr);gap:.85rem}
.outline-item__body{display:grid;gap:.45rem}
.outline-item__index,.candidate-index{font-size:.98rem;font-weight:700}
.section-summary{color:#35537e}
.editor-surface{min-height:320px;padding:1rem;border-radius:24px;border:1px solid rgba(255,255,255,.6);background:rgba(255,255,255,.84)}
.editor-surface p + p,.paper-preview-block + .paper-preview-block{margin-top:1rem}
.section-ribbon,.hint-panel,.content-card--soft{padding:1rem}
.fulltext-surface{max-height:640px;overflow:auto}
.bullet-list{margin:0;padding-left:1.2rem;display:grid;gap:.65rem;color:#60738d}
.keyword-cluster{display:flex;gap:.55rem;flex-wrap:wrap}
.choice-chip{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:.65rem 1rem;border-radius:999px;border:1px solid rgba(255,255,255,.62);background:rgba(255,255,255,.82);color:#60738d;font-weight:650}
.choice-chip--active{color:#2d6cff;border-color:rgba(71,118,212,.3);background:rgba(236,243,255,.96)}
.choice-card,.chapter-menu__item{width:100%;text-align:left;padding:1rem;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
.choice-card--active,.chapter-menu__item--active{border-color:rgba(71,118,212,.3);background:rgba(236,243,255,.96)}
.choice-card:hover,.chapter-menu__item:hover,.outline-item--link:hover,.project-card:hover,.primary-button:hover,.secondary-button:hover,.project-nav__item:hover,.rail-links a:hover{transform:translateY(-2px)}
.top-gap{margin-top:1.25rem}
.content-card--wide{grid-column:1 / -1}
@media (max-width:1180px){
 .landing-layout,.project-layout,.wizard-layout,.writing-layout,.outline-layout,.project-page-grid,.project-grid,.capability-board,.hero-stats,.metric-grid,.progress-card,.form-grid,.chapter-studio{grid-template-columns:1fr}
 .project-hero,.grid-header,.helper-banner,.page-intro,.section-ribbon,.hero-card__top,.site-header,.site-header__right,.site-header__panel,.card-heading{flex-direction:column;align-items:flex-start}
 .hero-card h1{max-width:none}
 .brand{font-size:2.1rem}
}
`;

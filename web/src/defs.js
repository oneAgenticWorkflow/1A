/* ---------- Definitions: stages, workflow template, forms ---------- */
var STAGES=[
 {n:'Onboarding',d:'Welcome, consent, Form 1 and CV review'},
 {n:'Profile and field',d:'Your advisor reviews your background and sets your working field of endeavor'},
 {n:'Deep intake',d:'Forms 2 to 9 and your documents are collected and reviewed'},
 {n:'Analysis and FOE',d:'Everything you submitted is analyzed; your field of endeavor is chosen and locked',gate:true},
 {n:'Criteria strategy',d:'Target criteria, recommended articles, memberships and judging; the plan is reviewed with you'},
 {n:'Evidence build',d:'Judging, memberships, awards, media, articles, proof'},
 {n:'Validate and letters',d:'Every claim proven; case re-scored; independent letters and the final narrative'},
 {n:'Attorney review',d:'Legal review before filing',gate:true},
 {n:'Filing',d:'Attorney files; RFE support'}
];
var OWNERS=['Candidate','Advisor','Attorney','Analysis'];
var TSTAT=['Not started','To do','In progress','Blocked','Done','Skipped'];
var PICK=['To do','In progress','Blocked','Done','Skipped'];

var TEMPLATE=[
 {k:'welcome',s:0,t:'Welcome call and consent',o:'Advisor',off:0,d:'Explain the program, the no-guarantee policy and how data is handled. Record the signed engagement and consent.'},
 {k:'f1',s:0,t:'Complete Form 1: Getting started',o:'Candidate',kind:'form',form:'f1',deps:['welcome'],off:5},
 {k:'r1',s:0,t:'Review Form 1 and the CV',o:'Advisor',kind:'review',form:'f1',deps:['f1'],off:7},
 {k:'profile',s:1,t:'Run the profile and eligibility screen',o:'Analysis',kind:'ai',deps:['r1'],off:8,d:'Reads the resume and Form 1 for profile, domain, experience and seniority, and gives an overall outlook. No criterion scoring yet. Never shown to the candidate.'},
 {k:'proceed',s:1,t:'Decide whether to proceed to deep intake',o:'Advisor',deps:['profile'],off:10,d:'Read the summary, then choose Proceed, Hold or Decline. Proceed opens the working field of endeavor step.'},
 {k:'foew',s:1,t:'Set the working field of endeavor',o:'Advisor',kind:'gate',gate:'foew',deps:['proceed'],off:12,d:'Write the field the deep intake will be built around, as a broad area with a focus on the niche. Use the Profile tab as a guide. No analysis runs here; the final field is drafted and locked after the full analysis.'},
 {k:'f2',s:2,t:'Complete Form 2: Projects',o:'Candidate',kind:'form',form:'f2',deps:['r1'],off:14},
 {k:'f3',s:2,t:'Complete Form 3: Scholarly record',o:'Candidate',kind:'form',form:'f3',deps:['r1'],off:18},
 {k:'f4',s:2,t:'Complete Form 4: Awards',o:'Candidate',kind:'form',form:'f4',deps:['foew'],off:28},
 {k:'f5',s:2,t:'Complete Form 5: Media',o:'Candidate',kind:'form',form:'f5',deps:['foew'],off:28},
 {k:'f6',s:2,t:'Complete Form 6: Compensation',o:'Candidate',kind:'form',form:'f6',deps:['foew'],off:20},
 {k:'f7',s:2,t:'Complete Form 7: Roles and critical role',o:'Candidate',kind:'form',form:'f7',deps:['foew'],off:32},
 {k:'f8',s:2,t:'Complete Form 8: Judging and memberships',o:'Candidate',kind:'form',form:'f8',deps:['foew'],off:28},
 {k:'f9',s:2,t:'Complete Form 9: Recommender pool',o:'Candidate',kind:'form',form:'f9',deps:['foew'],off:35},
 {k:'r2',s:2,t:'Review Form 2',o:'Advisor',kind:'review',form:'f2',deps:['f2'],off:34},
 {k:'r3',s:2,t:'Review Form 3',o:'Advisor',kind:'review',form:'f3',deps:['f3'],off:38},
 {k:'r4',s:2,t:'Review Form 4',o:'Advisor',kind:'review',form:'f4',deps:['f4'],off:31},
 {k:'r5',s:2,t:'Review Form 5',o:'Advisor',kind:'review',form:'f5',deps:['f5'],off:31},
 {k:'r6',s:2,t:'Review Form 6 and documents received',o:'Advisor',kind:'review',form:'f6',deps:['f6'],off:23},
 {k:'r7',s:2,t:'Review Form 7',o:'Advisor',kind:'review',form:'f7',deps:['f7'],off:35},
 {k:'r8',s:2,t:'Review Form 8',o:'Advisor',kind:'review',form:'f8',deps:['f8'],off:31},
 {k:'r9',s:2,t:'Review Form 9',o:'Advisor',kind:'review',form:'f9',deps:['f9'],off:38},
 {k:'art-topic',s:2,t:'Approve the first article topic and journal',o:'Advisor',deps:['r2','r3'],off:30,d:'Use Forms 1 to 3 to pick one first topic the candidate can write well and that shows real expertise. Check the journal: scope, indexing, review quality, fees and predatory status. Agree a publication date near day 45 so articles land about a month apart, never in a cluster.'},
 {k:'art1',s:2,t:'Write and submit article 1',o:'Candidate',deps:['art-topic'],off:45,d:'Write the first article on the approved topic and submit it to the approved journal. Keep the acceptance email, the published page and proof of the publication date. Your advisor times publication so articles appear about a month apart.'},
 {k:'analysis',s:3,t:'Run the full analysis',o:'Analysis',kind:'ai',deps:['r2','r3','r4','r5','r6','r7','r8','r9'],off:42,d:'Reads every reviewed form and document and rates all 10 criteria with evidence and gaps, and flags final-merits risks. Opens when all forms are reviewed and documents are checked.'},
 {k:'review',s:3,t:'Review the scorecard and red flags',o:'Advisor',deps:['analysis'],off:45,d:'Open the Scorecard tab. Correct any rating you disagree with. Resolve or accept each red flag.'},
 {k:'foe-ai',s:3,t:'Draft field of endeavor options',o:'Analysis',kind:'ai',deps:['review'],off:47,d:'Three options: primary, industry, research. Each lists the US growth evidence you must verify.'},
 {k:'foe',s:3,t:'FOE lock: approve the field of endeavor',o:'Advisor',kind:'gate',gate:'foe',deps:['foe-ai'],off:50,d:'Approve only after the statement is backed by US growth and impact evidence you have checked. Every later step uses it.'},
 {k:'foe-mkt',s:3,t:'Research the market and evidence for the field',o:'Analysis',kind:'ai',deps:['foe'],off:51,d:'Searches the web for market size and growth figures and maps the field to the national Critical and Emerging Technologies list. Builds the FOE, market and evidence table. Only links the search actually returned are kept.'},
 {k:'foe-mkt-ok',s:3,t:'Check the market figures and sources',o:'Advisor',deps:['foe-mkt'],off:53,d:'Open each source, confirm the figure and year, and edit the table in the Field tab. Every later step uses this table.'},
 {k:'judge-apply',s:3,t:'Apply to review for journals and conferences',o:'Candidate',deps:['art1'],off:70,d:'Once your first article is out, offer to serve as a peer reviewer or program committee member for 3 to 5 journals or conferences in your field. Your advisor gives you the outreach email. Keep every invitation and acceptance.'},
 {k:'art2',s:3,t:'Write and submit article 2',o:'Candidate',deps:['art1'],off:75,d:'Write the second approved article and submit it.'+' Publish about a month after your last article. Do not rush ahead: a steady record looks real and lasting, a cluster looks planned.'},
 {k:'strategy',s:4,t:'Suggest target criteria and options for each',o:'Analysis',kind:'ai',deps:['foe','foe-mkt-ok'],off:54,d:'Using the locked field of endeavor, calls Invest, Maintain or Skip for each criterion and lists options: actions, documents to request, article topics, venue types, judging routes and letter ideas.'},
 {k:'targets',s:4,t:'Choose the target criteria',o:'Advisor',deps:['strategy'],off:55,d:'Open the Scorecard tab. Every criterion is evaluated with Invest, Maintain or Skip and a reason. Tick every criterion worth building evidence for (no fixed number), then confirm. Unticked criteria have their evidence tasks skipped.'},
 {k:'f10',s:4,t:'Complete Form 10: Your article ideas',o:'Candidate',kind:'form',form:'f10',deps:['targets'],off:60,d:'Optional: 3 to 6 article ideas in your own words, grouped by category, with example ideas for your field. We add ours and pick the best four together.'},
 {k:'r10',s:4,t:'Review Form 10',o:'Advisor',kind:'review',form:'f10',deps:['f10'],off:63},
 {k:'recs',s:4,t:'Recommend articles, memberships and judging',o:'Analysis',kind:'ai',deps:['targets','r10'],off:65,d:'Eight article ideas across categories, each with an abstract, venue tier and possible journals; memberships to pursue, and how many and what kind of judging roles. Names are unverified until you check them.'},
 {k:'plan',s:4,t:'Edit and approve the recommendations',o:'Advisor',kind:'gate',gate:'plan',deps:['recs'],off:67,d:'Compare with the candidate\'s own ideas, shortlist the best four articles, then add, edit or remove any suggestion in the Plan tab. Approving turns the shortlist into tasks, held back until you have reviewed the plan with the candidate.'},
 {k:'review-cand',s:4,t:'Review the plan with the candidate',o:'Advisor',deps:['plan'],off:70,d:'Walk the candidate through the plan. When you are done, release the tasks to them.'},
 {k:'feas-draft',s:4,t:'Draft the feasibility summary for the candidate',o:'Analysis',kind:'ai',deps:['targets'],off:57,d:'Writes the plain-language outlook the candidate will see. You edit it before anything is released.'},
 {k:'feas',s:4,t:'Review and release the feasibility summary',o:'Advisor',kind:'gate',gate:'feas',deps:['feas-draft','review-cand'],off:72,d:'Nothing reaches the candidate until you release it from the Feasibility tab.'},
 {k:'venues',s:4,t:'Verify journals for the approved articles',o:'Advisor',deps:['plan'],off:72,d:'Check scope, indexing, review quality, fees and predatory status for each journal on the approved articles.'},
 {k:'judging-proof',s:5,t:'Collect proof of every completed review',o:'Candidate',deps:['plan'],off:105,d:'For every completed role keep four things: the invitation and your acceptance; proof you finished (review receipt, thank-you email, certificate or program listing); a short signed letter from the editor, chair or organizer saying what you judged; and one line on the venue (ranking, acceptance rate, audience). Aim for 5 to 8 completed roles over 6 to 9 months, from at least two types (paper review, award or competition judging, other expert evaluation), spread over more than a year. An invitation alone is not proof.'},
 {k:'f11',s:5,t:'Complete Form 11: Senior membership facts sheet',o:'Candidate',kind:'form',form:'f11',deps:['plan'],off:100,req:false,d:'Every job and client engagement with exact dates, your best results with their source, certifications and recognition, and the senior members who could act as references. We draft the application answers from this sheet.'},
 {k:'r11',s:5,t:'Review Form 11 and check the answers agree',o:'Advisor',kind:'review',form:'f11',deps:['f11'],off:104,req:false,d:'Titles, dates and figures must be identical wherever they appear. Fix overlaps and gaps in the date line. Confirm each client allows its name and figures to be used. Then draft the application answers for the candidate to review.'},
 {k:'mem-fit',s:5,t:'Run the fit test on each membership',o:'Advisor',deps:['plan'],off:90,req:false,d:'Count a membership as evidence only if all four are true: admission is decided by experts or a committee on achievement; the published criteria ask for outstanding or senior-level achievement; we hold the bylaws page and the candidate\'s certificate or letter; the association is recognised in the field. Save the bylaws link and the date checked. Memberships that fail are listed as helpful but not evidence.'},
 {k:'media-sheet',s:5,t:'Research existing coverage and sort it A, B or C',o:'Advisor',deps:['r5','plan'],off:62,req:false,d:'Record each piece in the shared sheet: title, URL, date, author, outlet, reach with a third-party source, whether the candidate is named, share about the candidate or work, kind, language. Sort: A names the candidate and discusses the work; B covers the project without the name (use it for contributions, role or field importance); C does not qualify (press release, paid, employer only).'},
 {k:'media-chk',s:5,t:'Review the media sheet',o:'Candidate',deps:['media-sheet'],off:70,req:false,d:'Confirm each item is accurate, mark anything wrong and tell us what is missing. Only coverage that names you and discusses your work counts as media evidence; coverage of the project without your name still helps as proof of your impact.'},
 {k:'awards',s:5,t:'Apply to shortlisted qualifying awards',o:'Candidate',deps:['r4','plan'],off:90,req:false,d:'No paid or vanity awards. For each award keep: the rules or call for entries, who judged it, the number of entrants and winners, proof there was no fee or purchase, the certificate or letter, and independent press about the award.'},
 {k:'angles',s:5,t:'Choose 3 to 5 story angles about the candidate',o:'Advisor',deps:['r5','plan'],off:65,req:false,d:'Angles must centre on the candidate, not only the employer.'},
 {k:'media',s:5,t:'Secure coverage in vetted outlets (editorial only)',o:'Candidate',deps:['angles'],off:120,req:false,d:'No pay-to-publish placements. For each piece keep: the full article with date and author, the page showing you are named and what share is about you, the outlet\'s circulation or traffic from a third party, and a certified translation if not in English.'},
 {k:'contrib',s:5,t:'Collect adoption and impact proof for top contributions',o:'Candidate',deps:['r2','plan'],off:90,d:'Two kinds of independent proof per contribution: adoption (users, downloads, licences, customers outside your employer), citations or third-party use, and letters from people who used it. Tie each claim to a number, a date and a link.'},
 {k:'role',s:5,t:'Get a signed org chart and employer distinction proof',o:'Candidate',deps:['r7','plan'],off:80},
 {k:'comp',s:5,t:'Compare compensation with DOL OES and survey data',o:'Advisor',deps:['r6','plan'],off:66,d:'Total compensation versus the 90th percentile for the same occupation and area. Save the source, table and date (DOL OES, a salary survey, or a named benchmark) next to the candidate\'s W-2s and offer letter.'},
 {k:'art3',s:5,t:'Write and submit article 3',o:'Candidate',deps:['art2'],off:105,d:'Write the third approved article and submit it.'+' Publish about a month after your last article. Do not rush ahead: a steady record looks real and lasting, a cluster looks planned.'},
 {k:'art4',s:5,t:'Write and submit article 4',o:'Candidate',deps:['art3'],off:135,d:'Write the fourth approved article and submit it.'+' Publish about a month after your last article. Do not rush ahead: a steady record looks real and lasting, a cluster looks planned.'},
 {k:'art5',s:5,t:'Write and submit article 5',o:'Candidate',deps:['art4'],off:165,d:'Write the fifth approved article and submit it.'+' Publish about a month after your last article. Do not rush ahead: a steady record looks real and lasting, a cluster looks planned.'},
 {k:'speak-targets',s:5,t:'Choose 5 target conferences for speaking',o:'Advisor',deps:[],off:30,req:false,d:'Optional. Pick selective, respected conferences in the field. Prefer events that invite speakers, keynotes or invited talks, over open pay-to-present events.'},
 {k:'speak-submit',s:5,t:'Send talk proposals and ask about invited slots',o:'Candidate',deps:['speak-targets'],off:60,req:false,d:'Optional. Send one strong abstract adapted for each event. Ask organizers whether they invite speakers or keynotes. An invitation counts for more than an accepted submission.'},
 {k:'speak-proof',s:5,t:'Keep proof for every talk',o:'Candidate',deps:['speak-submit'],off:150,req:false,d:'Optional. For each talk keep: the program page with your name and your role (keynote or invited), the invitation email, an organizer letter, and the slides or recording.'},
 {k:'verify',s:6,t:'Evidence verification: every claim has proof',o:'Advisor',deps:['judging-proof','contrib','role','comp'],off:135},
 {k:'rescore',s:6,t:'Re-score the case',o:'Analysis',kind:'ai',deps:['verify'],off:137},
 {k:'decide',s:6,t:'Filing-ready decision, or fall back to NIW or O-1',o:'Advisor',deps:['rescore'],off:140,d:'Internal rule of thumb: at least 4 criteria High and no open red flags.'},
 {k:'indep',s:6,t:'Verify recommender independence',o:'Advisor',deps:['r9','decide'],off:143},
 {k:'letters-out',s:6,t:'Send recommender briefs and requests',o:'Advisor',deps:['indep'],off:148},
 {k:'letters-in',s:6,t:'Collect 6 to 8 signed letters',o:'Candidate',deps:['letters-out'],off:170},
 {k:'narrative',s:6,t:'Draft the final merits narrative',o:'Advisor',deps:['decide'],off:160},
 {k:'exhibits',s:6,t:'Build the exhibit index and certified translations',o:'Advisor',deps:['narrative','letters-in'],off:178},
 {k:'art6',s:6,t:'Write and submit article 6 (optional)',o:'Candidate',deps:['art5'],off:195,req:false,d:'Optional sixth article if the plan and timing allow.'+' Publish about a month after your last article. Do not rush ahead: a steady record looks real and lasting, a cluster looks planned.'},
 {k:'pack',s:7,t:'Send the full package to the attorney',o:'Advisor',deps:['exhibits'],off:180},
 {k:'attorney',s:7,t:'Attorney review: approve for filing',o:'Attorney',kind:'gate',gate:'attorney',deps:['pack'],off:188,d:'Counsel reviews the evidence index and narrative. Nothing is filed from this tracker.'},
 {k:'file',s:8,t:'Attorney files the petition (premium processing decision)',o:'Attorney',deps:['attorney'],off:195},
 {k:'rfe',s:8,t:'Monitor for RFE or NOID',o:'Attorney',deps:['file'],off:230,req:false}
];

var VISAS=['H-1B','L-1','F-1 OPT/STEM OPT','O-1','EAD','Outside the US','Other'];
var GOALS=['3 months','6 months','12 months','18+ months'];
var YN=['Yes','No'];
var YNU=['Yes','No','Unsure'];
var LEVEL=['Company','Local','Regional','National','International'];
var PROOFSTAT=['Documented','Can obtain','Estimate only'];
function fd(k,l,t,x){var o={k:k,l:l,t:t||'text'};if(x)for(var i in x)o[i]=x[i];return o}
var ART_CATS=['Core concepts explained','Research and innovations','Case studies and lessons','Industry applications','Your field and society','Methods, benchmarks and frameworks','People and systems working together'];
var METRIC_COLS=[{k:'metric',l:'Metric',t:'text'},{k:'before',l:'Before',t:'text'},{k:'after',l:'After',t:'text'},{k:'period',l:'Period',t:'text'},{k:'source',l:'How measured, or source',t:'text'},{k:'proof',l:'Proof',t:'select',o:PROOFSTAT}];
var MEDIA_NAMED=['Named in the title or first paragraph','Named later in the body','Not named; company only'];

var FORMS=[
{id:'f1',n:'Form 1: Getting started',who:'Candidate',intro:'About 20 minutes. Do not paste passport numbers, SSNs or tax returns here.',parts:[
 {id:'id',title:'About you',fields:[
  fd('name','Full legal name (as on passport)','text',{req:1}),fd('email','Email','text',{req:1}),
  fd('birth','Country of birth','text',{req:1}),fd('citizen','Country of citizenship','text',{req:1}),
  fd('location','Current location (country, state)','text',{req:1}),
  fd('status','Current US status','select',{o:VISAS,req:1}),fd('expiry','Status expiry date','date',{req:1}),
  fd('petitions','Pending or approved petitions (I-140, O-1, NIW, PERM): type, date, outcome','area'),
  fd('rfe','Any prior RFE, NOID or denial? What happened','area')]},
 {id:'goals',title:'Goals',fields:[
  fd('timeline','Target filing timeline','select',{o:GOALS,req:1}),
  fd('fallback','Open to NIW or O-1 as a fallback?','select',{o:YNU,req:1}),
  fd('hours','Hours per week you can give to tasks','select',{o:['1 to 3','4 to 6','7 to 10','10+'],req:1}),
  fd('employer','Would your employer support a letter or an org chart?','select',{o:YNU}),
  fd('intent','What will you keep doing in the US in this field? Employer, venture or independent work, and in which state','area',{h:'The petition must show you will continue work in your field of expertise. A plain description is enough.'}),
  fd('usben','How will your continued work benefit the US? Customers, jobs, industries, public programs','area')]},
 {id:'career',title:'Career',fields:[
  fd('cv','CV or resume (paste the full text)','area',{req:1,tall:1,minWords:150}),
  fd('linkedin','LinkedIn URL','url',{req:1}),
  fd('title','Current title, employer and start date','text',{req:1}),
  fd('scope','Your scope: who you report to (title only), team size, what you own','area',{req:1}),
  fd('tech','Core technologies and tools (up to 10, comma separated)','text',{req:1}),
  fd('industries','Industries you have served','text'),
  fd('edu','Education: degree, field, institution, year (one per line)','area',{req:1})]},
 {id:'foot',title:'Digital footprint',fields:[
  fd('scholar','Google Scholar URL','url'),fd('scholar_nums','Citations and h-index (with where you read them)','text'),
  fd('orcid','ORCID','text'),fd('github','GitHub URL','url'),
  fd('repos','Top repositories: name, stars, forks, downloads, dependents (one per line)','area'),
  fd('site','Personal website, blog or portfolio','url'),fd('patents','Patents filed or granted: number, title, status','area')]},
 {id:'check',title:'What applies to you',fields:[
  fd('ticks','Tick everything that applies','multi',{o:['Peer review or judging','Published papers or trade articles','Leading or critical role','Press or media coverage','Compensation above peers','Awards or honors','Professional memberships','Talks, keynotes or panels','Open-source projects with outside users','Systems used by many people or companies']}),
  fd('counts','Give a one-line count for each ticked item','area')]},
 {id:'top',title:'Proudest work',fields:[
  fd('top3','Three contributions you are proudest of: what, when, measurable result','area',{req:1,tall:1}),
  fd('usimp','Why does your work matter to the US (customers, deployments, jobs, public benefit)?','area',{req:1})]},
 {id:'consent',title:'Consent',fields:[
  fd('c1','I consent to my data and documents being processed for this program.','check',{req:1}),
  fd('c2','I understand results are not guaranteed and this is not legal advice.','check',{req:1}),
  fd('c3','I understand the program will not use paid awards or pay-to-publish media.','check',{req:1}),
  fd('c4','Everything I provide is true and I can supply proof.','check',{req:1})]}
]},
{id:'f2',n:'Form 2: Projects',who:'Candidate',intro:'One entry per major project. Give 3 to 6 of your most significant projects over 10 to 15 years; older ones can go in your CV. Do not write sentences you cannot prove. Leave a number blank if you do not have it.',parts:[
 {id:'projects',title:'Projects',repeat:{label:'Project',title:'name',min:3,max:6},fields:[
  fd('name','Project name','text',{req:1}),fd('employer','Employer (company you worked for)','text',{req:1}),
  fd('client','Client or business unit','text',{req:1}),
  fd('role','Your role','select',{o:['Technical lead','Architect','Sole contributor','Senior contributor','Manager','Founder','Other'],req:1}),
  fd('role_title','Exact job title on that project','text',{req:1}),
  fd('start','Start date','date',{req:1}),fd('end','End date (leave empty if ongoing)','date'),
  fd('type','Project type','select',{o:['Internal','External (customer-facing)'],req:1}),
  fd('domain','Domain or industry','text',{req:1}),
  fd('problem','What was broken, slow, costly or impossible before?','area',{req:1,minWords:30}),
  fd('mine','What did you personally decide, design or build? (not the team)','area',{req:1,minWords:40}),
  fd('team','Team size, who reported to you, who relied on your work','text',{req:1}),
  fd('novel','What was new or not standard practice at the time?','area',{req:1,minWords:30}),
  fd('tech','Technologies and versions','text',{req:1}),
  fd('metrics','Measurable results','rows',{cols:METRIC_COLS,req:1,h:'At least one row. Give before and after values and how you know. Mark estimates as estimates.'}),
  fd('scale','Scale: users, transactions or data volume, with the source','text'),
  fd('adoption','Who outside your team adopted or reused it?','area'),
  fd('usimp','US impact: US customers, deployments, jobs, public or national interest','area',{req:1}),
  fd('valid','Independent validation','rows',{cols:[{k:'kind',l:'Type',t:'select',o:['Press','Citation','Letter','Award','Customer','Other']},{k:'what',l:'What it shows',t:'text'},{k:'url',l:'Link or file name',t:'text'}],h:'Press, third-party papers, customers, awards, letters. Homepages do not count.'}),
  fd('has_oss','Did this produce an open-source release?','select',{o:YN}),
  fd('oss','Open-source link, stars, forks, downloads','text',{when:['has_oss','Yes']}),
  fd('has_pat','Did this lead to a patent or invention disclosure?','select',{o:YN}),
  fd('pat','Patent number or disclosure, status','text',{when:['has_pat','Yes']}),
  fd('awards','Awards for this project','rows',{cols:[{k:'name',l:'Award name',t:'text'},{k:'issuer',l:'Issuer',t:'text'},{k:'year',l:'Year',t:'text'},{k:'level',l:'Level',t:'select',o:LEVEL}],h:'Name the real award, the issuer and the year. Internal company recognition counts as company level.'}),
  fd('media','Media about this project','rows',{cols:[{k:'title',l:'Title',t:'text'},{k:'outlet',l:'Outlet',t:'text'},{k:'url',l:'URL',t:'text'},{k:'named',l:'Are you named?',t:'select',o:MEDIA_NAMED}]}),
  fd('publishable','Can this project be described publicly?','select',{o:['Yes','Only with client approval','No'],req:1}),
  fd('contact','A client or manager who could confirm your role (name, title)','text'),
  fd('docs','Documents you can provide (design docs, release notes, certificates, dashboards)','area')]}
]},
{id:'f3',n:'Form 3: Scholarly record',who:'Candidate',intro:'What you have already published or presented. Leave a section empty if you have nothing to list. We will suggest article topics for you later.',parts:[
 {id:'record',title:'Existing record',fields:[
  fd('pubs','Peer-reviewed papers and proceedings','rows',{cols:[{k:'title',l:'Title',t:'text'},{k:'venue',l:'Venue',t:'text'},{k:'year',l:'Year',t:'text'},{k:'pos',l:'Your author position',t:'text'},{k:'link',l:'DOI or URL',t:'text'},{k:'cites',l:'Citations',t:'text'}]}),
  fd('trade','Trade articles, whitepapers, book chapters, preprints','rows',{cols:[{k:'title',l:'Title',t:'text'},{k:'venue',l:'Venue',t:'text'},{k:'year',l:'Year',t:'text'},{k:'link',l:'URL',t:'text'}]}),
  fd('selfcite','Roughly how many citations are not from you or your co-authors?','text'),
  fd('talks','Talks and blog posts with view or attendance counts','area')]}
]},
{id:'f4',n:'Form 4: Awards',who:'Candidate',intro:'Only awards from outside your employer count in a petition. Fee-based or vanity awards weaken a case, so tell us if you paid to enter.',parts:[
 {id:'sum',title:'Do you have awards?',fields:[fd('have','Have you received any awards, prizes or honors?','select',{o:YN,req:1})]},
 {id:'awards',title:'Awards',when:['sum','have','Yes'],repeat:{label:'Award',title:'name',min:1,max:12},fields:[
  fd('name','Award name','text',{req:1}),fd('issuer','Issuing organization','text',{req:1}),fd('year','Year','num',{req:1}),
  fd('level','Level','select',{o:LEVEL,req:1}),
  fd('team','Individual or team award?','select',{o:['Individual','Team'],req:1}),
  fd('role','If team: your role and share','text'),
  fd('selection','Who judged it and what were the criteria?','area',{req:1}),
  fd('entrants','Number of entrants','num'),fd('winners','Number of winners','num'),
  fd('fee','Was an entry fee, sponsorship or purchase required?','select',{o:['No fee','Entry fee','Sponsorship or purchase required'],req:1}),
  fd('url','Award page, call for entries or winner list','url',{req:1}),
  fd('proof','Certificate or letter','select',{o:['Will send through the document request','Have it','Cannot get it'],req:1}),
  fd('press','Press coverage of the award (links)','area')]},
 {id:'plan',title:'Awards you might apply for',fields:[fd('want','Awards you have applied for or plan to apply for','area')]}
]},
{id:'f5',n:'Form 5: Media',who:'Candidate',intro:'Coverage must be about you and your work, not just mention your employer. Paid or sponsored pieces are discounted.',parts:[
 {id:'sum',title:'Do you have coverage?',fields:[fd('have','Has anything been published about you or your work?','select',{o:YN,req:1})]},
 {id:'cov',title:'Coverage',when:['sum','have','Yes'],repeat:{label:'Piece',title:'title',min:1,max:12},fields:[
  fd('title','Title','text',{req:1}),fd('outlet','Outlet','text',{req:1}),fd('date','Date','date',{req:1}),fd('author','Author','text'),
  fd('url','URL','url',{req:1}),
  fd('named','Where are you named?','select',{o:MEDIA_NAMED.concat(['Not named at all']),req:1}),
  fd('share','How much is about you or your work?','select',{o:['Focus of the piece','Major part','Brief mention','Company only'],req:1}),
  fd('kind','What kind of piece is it?','select',{o:['Editorial article','Interview','Paid or sponsored','Press release','Blog or self-published'],req:1}),
  fd('circ','Outlet circulation or traffic, if known','text'),fd('lang','Language (if not English, a certified translation is needed)','text')]},
 {id:'more',title:'Talks and press contacts',fields:[
  fd('talks','Talks, podcasts and interviews','rows',{cols:[{k:'venue',l:'Venue or show',t:'text'},{k:'date',l:'Date',t:'text'},{k:'aud',l:'Audience size',t:'text'},{k:'url',l:'Recording URL',t:'text'}]}),
  fd('contacts','Journalists, editors or communications teams you already know','area'),
  fd('topics','Which of your achievements are you comfortable being profiled for?','area',{req:1}),
  fd('approval','Does your employer need to approve media? Who handles it?','text',{req:1})]}
]},
{id:'f6',n:'Form 6: Compensation',who:'Candidate',intro:'Enter figures here. Do not paste tax documents; they go through the secure document request.',parts:[
 {id:'who',title:'Your role',fields:[
  fd('title','Job title','text',{req:1}),fd('occ','Occupation (SOC code if you know it)','text'),
  fd('loc','Work location (city, state)','text',{req:1}),fd('yrs','Years of experience','num',{req:1}),
  fd('degree','Highest degree','select',{o:['Bachelor','Master','Doctorate','Other'],req:1}),
  fd('teamsz','Team size you lead, if any','text')]},
 {id:'pay',title:'Pay',fields:[
  fd('salary','Last three years','rows',{req:1,cols:[{k:'year',l:'Year',t:'text'},{k:'base',l:'Base ($)',t:'text'},{k:'bonus',l:'Bonus ($)',t:'text'},{k:'signon',l:'Sign-on ($)',t:'text'},{k:'other',l:'Other ($)',t:'text'}]}),
  fd('equity','Equity grants','rows',{cols:[{k:'date',l:'Grant date',t:'text'},{k:'units',l:'Units',t:'text'},{k:'value',l:'Grant value ($)',t:'text'},{k:'vest',l:'Vesting',t:'text'},{k:'now',l:'Current value ($)',t:'text'}]}),
  fd('how','Was your pay set by a review, promotion or a competing offer?','text')]},
 {id:'docs',title:'Documents',fields:[
  fd('w2','W-2s or tax transcripts, last 3 years','select',{o:['Will send through the document request','Already sent','Cannot provide'],req:1}),
  fd('offer','Current offer letter or compensation statement','select',{o:['Will send through the document request','Already sent','Cannot provide'],req:1}),
  fd('bench','Surveys or other offers you can share','area')]}
]},
{id:'f7',n:'Form 7: Roles and critical role',who:'Candidate',intro:'One entry per organization where you claim a leading or critical role.',parts:[
 {id:'orgs',title:'Organizations',repeat:{label:'Organization',title:'org',min:1,max:6},fields:[
  fd('org','Organization','text',{req:1}),fd('title','Your title','text',{req:1}),
  fd('start','Start date','date',{req:1}),fd('end','End date (empty if current)','date'),
  fd('size','Size, funding stage or revenue, valuation, customers','text',{req:1}),
  fd('distinct','Proof the organization is distinguished (funding news, rankings, major clients, press)','rows',{req:1,cols:[{k:'what',l:'What it shows',t:'text'},{k:'url',l:'Link',t:'text'}]}),
  fd('chart','Org chart evidence','select',{o:['I have a signed org chart','I can get one','Not available'],req:1}),
  fd('reports','Who you report to, who reports to you, who your peers are (titles)','area',{req:1}),
  fd('decisions','What products, systems, budgets or hires did you decide?','area',{req:1}),
  fd('without','What would have been different if you had not been in this role?','area',{req:1,minWords:25}),
  fd('results','Results tied to your leadership','rows',{cols:METRIC_COLS}),
  fd('exec','An executive who could sign a support letter (name, title)','text'),
  fd('recog','Promotions, retention actions or awards from this employer','area')]}
]},
{id:'f8',n:'Form 8: Judging and memberships',who:'Candidate',intro:'Judging counts only with proof that you did the work. An invitation alone is not enough.',parts:[
 {id:'jsum',title:'Judging',fields:[fd('have','Have you judged, reviewed or served on a panel?','select',{o:YN,req:1})]},
 {id:'judging',title:'Judging activities',when:['jsum','have','Yes'],repeat:{label:'Activity',title:'venue',min:1,max:15},fields:[
  fd('type','Type','select',{o:['Paper review','Conference program committee','Grant panel','Award jury','Competition judge','Thesis committee','Other'],req:1}),
  fd('venue','Venue or organization','text',{req:1}),fd('role','Your role','text',{req:1}),fd('date','Date','date',{req:1}),
  fd('items','Number of items judged','num'),
  fd('done','Did you finish the work?','select',{o:['Yes, completed','In progress','Invited but not done'],req:1}),
  fd('proof','Proof you have','select',{o:['Review receipt','Thank-you email','Certificate','Program listing','Invitation only'],req:1}),
  fd('letter','Can the organizer or editor sign a short letter confirming what you judged?','select',{o:['Yes','Maybe','No'],req:1}),
  fd('ctx','About the venue: ranking, acceptance rate, audience or number of entries','text'),
  fd('scope','Scope','select',{o:LEVEL,req:1}),
  fd('invited','How did this happen?','select',{o:['They invited me','I applied or volunteered']}),
  fd('url','Link','url')]},
 {id:'opps',title:'Where you could offer to review',fields:[
  fd('where','Journals, conferences or organizations you could approach','area'),
  fd('knows','Editors, chairs or organizers you know personally','area'),
  fd('profiles','Reviewer profiles (Web of Science, OpenReview, EasyChair)','text')]},
 {id:'msum',title:'Memberships',fields:[fd('have','Are you a member of any professional association?','select',{o:YN,req:1})]},
 {id:'members',title:'Memberships held',when:['msum','have','Yes'],repeat:{label:'Membership',title:'name',min:1,max:8},fields:[
  fd('name','Association and level','text',{req:1}),fd('year','Year joined','num',{req:1}),
  fd('qual','How did you qualify?','select',{o:['Fee only','Application with references','Nomination','Review of achievements by experts'],req:1}),
  fd('bylaws','Membership criteria or bylaws (link)','url',{req:1}),
  fd('who','Who decides admission? Expert committee or staff','text'),
  fd('cert','Certificate or letter','select',{o:['Will send through the document request','Have it','Cannot get it'],req:1})]},
 {id:'elig',title:'Eligible but not yet a member',fields:[fd('eligible','Associations you may qualify for','area')]},
 {id:'refs',title:'IEEE and references',fields:[
  fd('ieee','IEEE member number and grade, if you are a member','text'),
  fd('refs','Senior members, Fellows or association officers who know your work and could act as references (name, title, grade, how they know you)','area',{h:'Some memberships, such as Senior IEEE, need three references from members at Senior grade or higher.'})]}
]},
{id:'f9',n:'Form 9: Recommender pool',who:'Candidate',intro:'We need 6 to 8 independent experts. List people who know your work. We check independence; nobody is contacted without your say-so.',parts:[
 {id:'recs',title:'Recommenders',repeat:{label:'Person',title:'name',min:6,max:12},fields:[
  fd('name','Name','text',{req:1}),fd('title','Title','text',{req:1}),fd('org','Organization','text',{req:1}),
  fd('contact','Email or LinkedIn','text',{req:1}),
  fd('how','How do you know them, and for how long?','area',{req:1}),
  fd('rel','Relationship','select',{o:['Never worked together','Co-author','Colleague','Manager or direct report','Thesis advisor','Client','Other'],req:1}),
  fd('knows','What do they know of your work, and how? (read a paper, used your software, saw a talk)','area',{req:1}),
  fd('standing','Their standing: professorship, executive role, publications, awards','area',{req:1}),
  fd('where','Where do they work?','select',{o:['United States','Outside the United States']}),
  fd('likely','How likely are they to agree?','select',{o:['Very likely','Likely','Unsure']}),
  fd('concerns','Anything we should know (conflicts, timing)?','text')]},
 {id:'wish',title:'Experts you do not know yet',fields:[fd('wish','Experts you would like a letter from but have no connection to','area')]}
]},
{id:'f11',n:'Form 11: Senior membership facts sheet',who:'Candidate',intro:'Used to draft your Senior-level membership application. Give exact months and years. Titles, dates and figures must match your CV and everything else you have given us. If two jobs overlapped, say so.',parts:[
 {id:'jobs',title:'Every job and client engagement',repeat:{label:'Engagement',title:'org',min:1,max:20},fields:[
  fd('org','Employer, and client if different','text',{req:1}),
  fd('title','Exact job title on this engagement','text',{req:1}),
  fd('start','Start (month and year)','date',{req:1}),fd('end','End (empty if current)','date'),
  fd('overlap','Did this overlap another job or engagement? Explain','text'),
  fd('scope','Scope: team size, systems you owned, users or volume','text',{req:1}),
  fd('results','Results with the best proof','rows',{req:1,cols:[{k:'what',l:'Result',t:'text'},{k:'num',l:'Number',t:'text'},{k:'src',l:'Where the number came from',t:'text'},{k:'who',l:'Who can confirm',t:'text'}]}),
  fd('ok','May the client name and these figures be used?','select',{o:['Yes','Only with approval','No'],req:1})]},
 {id:'gaps',title:'Gaps',fields:[fd('gaps','Any period with no engagement listed above (leave, bench time, study)? What were you doing?','area')]},
 {id:'recog',title:'Recognition and credentials',fields:[
  fd('certs','Certifications','rows',{cols:[{k:'name',l:'Certification',t:'text'},{k:'issuer',l:'Issuer',t:'text'},{k:'year',l:'Year',t:'text'}]}),
  fd('recog','Awards, promotions, talks, mentoring, publications, patents (with years)','area'),
  fd('edu','Degrees and years, for the education credit','area')]},
 {id:'refs',title:'Membership details',fields:[
  fd('ieee','IEEE member number','text'),
  fd('refs','Names of up to three Senior or higher IEEE members who could act as references','area')]}
]},
{id:'f10',n:'Form 10: Your article ideas',who:'Candidate',intro:'Write 3 to 6 ideas for articles about the knowledge you have gained in your field. They do not have to be about your own work, and they should stay general: please do not name your employer, clients, internal systems or figures, since some employers need permission for that. Use at most two ideas per category, and skip categories that do not fit your field. Add a title and 100 to 200 words on what the article would cover. We add our own ideas, pick the best four together, and work on them two at a time: we prepare outlines and edit, you supply the substance, check every statement and approve the final text before anything is submitted. You are the named author. Leave this blank if you have no ideas yet.',parts:[
 {id:'ideas',title:'Your article ideas',repeat:{label:'Idea',title:'title',min:1,max:8},fields:[
  fd('cat','Category','select',{o:ART_CATS}),
  fd('title','Working title','text'),
  fd('summary','What the article would cover, in 100 to 200 words: the problem, the approach or insight, and why it matters to people in your field','area',{tall:1}),
  fd('state','Where is it now?','select',{o:['Just an idea','Outline or notes','Draft written','Submitted','Published']}),
  fd('venues','Journals or publications you have in mind (optional)','text'),
  fd('conf','Anything your employer would need to approve or keep confidential?','text')]}
]}
];
function formDef(id){return FORMS.find(function(f){return f.id===id})}

# 4. From Notebook to Production: How Real Systems Get Built

Every course in this field ends the same way: a clean dataset, a notebook, a model that scores well, a screenshot for the portfolio. Almost no real project begins that way. Real projects begin with a manager asking a vague question, a database that three departments fill in differently, and a deadline. The distance between the notebook and a system that runs at four in the morning without waking anyone is the actual profession — barely taught, because it is unglamorous. This chapter walks that distance, because several of you will walk it for a living, and because the mistakes that end careers in this field are almost never mathematical. They are procedural, and avoidable once named.

The honest headline first: in a typical applied project, the modelling — the part the courses examine — is a modest slice of the work. The rest is deciding whether to build at all, getting data you can trust, measuring honestly, shipping, and watching. Practitioners at Google described production machine-learning systems as a small core of learning code surrounded by a vast apparatus of data handling, configuration, and monitoring — *hidden technical debt*, in their phrase, for how such systems quietly accumulate future trouble.[^sculley] Nothing since has made that picture less true.

## 4.1 Problem framing: the decision before the data

The first professional skill is knowing when *not* to use machine learning, and it is genuinely a skill, because every incentive points the other way — it is the technique you just paid to learn, the one on the job advert, the one the manager saw a headline about.

Reach for machine learning when three things hold at once: the mapping from inputs to outputs is too complex or too shifting to write down as rules; you have (or can get) many examples of the mapping done right; and being wrong sometimes is affordable, because a learned model *will* be wrong sometimes. When any of the three fails, prefer something duller. If the rule is expressible — "flag any invoice over the approval limit" — write the rule; it will be transparent, testable, and explainable to an auditor, which no model is by default. If you have a few dozen examples, a model will memorise them and call it learning; Chapter 1 told you how that story ends. And if a single wrong output is catastrophic and cannot be caught by a human downstream, then a system that is confidently wrong at unpredictable moments — Chapter 2's brittleness — is the wrong tool, however high its average score.

There is a second framing question, asked less often: *what decision will this prediction change?* A forecast nobody acts on is decoration. A surprising number of projects die at deployment because nobody asked, at the start, who would consume the output, on what screen, with what authority to act. Ask it in the first meeting. It is the cheapest question in the field.

## 4.2 Data collection and labelling: where quality dies

Whatever the model will learn is already lying, right now, in some table — with its missing weeks, its sensor that drifted for a month before anyone noticed. Data work is where quality is won or lost, and it is lost by default, because data is usually collected as a by-product of running a business, not for the purpose you now have in mind. The timestamp is local time in one system and UTC in another. The "cancelled" flag was repurposed in 2023. None of this is in the data dictionary, because there is no data dictionary.

Labels deserve particular suspicion, because supervised learning treats them as truth and they are merely testimony. Someone — a tired annotator, an outsourced click-worker, a doctor filling a form at the end of a twelve-hour shift, a past manager whose hiring decisions now count as "correct" — produced each one. Ask three questions of any labelled dataset: *Who* labelled it, and what did they know? *When*, and has the world moved since? And *what were they paid to optimise* — accuracy, or speed? If two annotators disagree on a good fraction of items, that disagreement is not noise to average away; it is the honest measurement of how ambiguous your task is, and no model will beat the ceiling it sets.

:::check reread="4.2"
question: A team trains a model to predict "good hires" using labels derived from past managers' performance reviews. What is the deepest problem with these labels?
- Performance reviews are too long to process as text.
- The labels record past human judgements, with all their bias and inconsistency, and the model will treat those judgements as ground truth to be reproduced.
- There is no problem; labels from real business records are by definition correct.
- The labels are a problem only if the dataset is small.
answer: 2
explanation: Labels are testimony, not truth. Reviews encode who past managers noticed, favoured, and promoted — which Chapter 2 showed can carry structural bias — and a supervised model will faithfully learn to continue those judgements under a veneer of objectivity. Interrogating where labels come from, who made them, and what they were really optimising is the first act of data quality, before any cleaning script runs.
:::

## 4.3 The split, and the bug that flatters you

Chapter 1 established the iron rule: never trust a number measured on data the model trained on. Practice turns that rule into furniture. You divide your examples into a *training set* the model learns from, a *validation set* you use while tuning your choices, and a :::glossary term="Test set"::: you lock in a drawer and touch once, at the end, to get the honest number. The discipline matters because every time you peek at a set and adjust your model in response, that set stops being a fair examiner — you are slowly fitting to it, the way a student who retakes the same mock exam ten times is no longer being tested.

And here is the classic career-making bug. :::glossary term="Data leakage"::: is what happens when information from outside the training set — usually from the future, or from the answer itself — sneaks into the features. The model looks brilliant in evaluation and collapses in production, because in production the leaked information does not exist yet.

:::definition term="Data leakage"
Data leakage occurs when a model is trained or evaluated using information that would not actually be available at prediction time — a feature computed from the future, a statistic calculated over the whole dataset before splitting, a duplicate of the answer hiding in an innocent-looking column. Leakage inflates measured performance, sometimes spectacularly, and the inflation vanishes on deployment. It is among the most common and most embarrassing failure modes in applied machine learning precisely because it makes results *better*, so nobody instinctively goes looking for it.
:::

Leakage is treacherous because it wears the costume of success. A model predicting hospital readmission that quietly includes a "discharged to follow-up clinic" flag — recorded *after* the readmission decision — will score superbly and know nothing. A fraud model trained on data shuffled randomly across time learns from Tuesday's fraud to "predict" Monday's. The tell is almost always the same: a result that is too good. In this field, *too good* is not a happy surprise. It is an alarm. The professional reflex, on seeing a wonderful number, is not to screenshot it but to ask what leaked.

:::check reread="4.3"
question: Your churn model scores 99% in offline evaluation but performs no better than guessing in production. Which explanation should you investigate first?
- The production servers are slower than your laptop.
- Data leakage — some feature available in your historical dataset (for example, one recorded after the customer had already churned) is not actually available at prediction time.
- The model needs more layers.
- Customers changed their behaviour overnight.
answer: 2
explanation: A dramatic gap between a superb offline score and useless production performance is the signature of leakage: the evaluation let the model see something the live system cannot. Distribution shift and other causes are possible, but a 99% offline score on a hard problem is itself the red flag — results that are too good are alarms, not achievements, and checking what leaked comes before celebrating.
:::

## 4.4 Baselines first, and the honest reading of metrics

Before any model, build the dumbest possible predictor: always guess the most common outcome; predict that tomorrow equals today; use the one rule the domain expert already applies. This :::glossary term="Baseline"::: takes an hour and buys two things. It tells you whether the fancy model is earning its complexity — a system that beats the baseline by a sliver may not be worth its maintenance cost — and it tells you whether the problem is even hard. A surprising number of business problems are nearly solved by "predict last week."

Then choose your measuring stick with care, because a single "accuracy" number can lie fluently. Suppose one email in a hundred is spam. A filter that marks *everything* as safe is 99% accurate and 100% useless. For problems like this you need two separate questions, and they pull against each other. :::glossary term="Precision"::: asks: of the items the model flagged, how many were truly what it claimed? :::glossary term="Recall"::: asks: of the items that were truly there to be found, how many did the model catch?

| | The model's flag is usually right | The model catches most real cases |
|---|---|---|
| **High precision, low recall** | Yes — few false alarms | No — many cases slip through |
| **High recall, low precision** | No — many false alarms | Yes — little escapes it |

You can always buy more of one with the other — flag everything, or flag only the certainties — and where to sit on that trade-off is not a technical question — it is a question about which mistake hurts more, and it belongs to the people who bear the mistakes. A cancer screen wants recall (miss nothing; tolerate false alarms that a follow-up test will clear). A system that automatically suspends worker accounts had better want precision. And any metric, once it becomes a target someone is rewarded for, will be gamed — teams learn to move the number without moving the reality it was meant to measure.[^goodhart] The defence is to track more than one number, and to keep asking what the number is *for*.

## 4.5 Deployment, monitoring, and the long afterwards

Shipping the model is the beginning, not the end. Chapter 2 introduced :::glossary term="Distribution shift":::; production is where you live with it. In practice the world's slow walk away from your training data is called *drift*, and it is not an anomaly — it is the weather. Customers change, fraudsters adapt (sometimes specifically to your model), a supplier reformats a field, and the photograph your model was ages quietly.

So real systems are wrapped in monitoring: dashboards that watch the inputs (do today's values still look like training data?), the outputs (has the approval rate lurched?), and — hardest and most important — the outcomes, which often arrive weeks late, because you learn whether a loan went bad long after you predicted it wouldn't. Real systems also need retraining pipelines, versioning so you can answer "which model made that decision in March?", and a rollback path for the bad day. Little of this is machine learning. All of it is the job.

:::argument title="The data-and-plumbing thesis"
conclusion: In a typical applied project, effort spent on data quality, evaluation discipline, and monitoring returns more than the same effort spent improving the model itself.
premise: The model can only learn what the data contains, so data errors and label noise put a hard ceiling on performance that no algorithm can raise.
premise: The most damaging practical failures — leakage, gamed metrics, silent drift — occur in the pipeline and the evaluation, not inside the learning algorithm.
premise: Off-the-shelf models are now strong enough that competing teams usually share roughly the same modelling toolbox, so data and process are where projects actually differ.
premise: A modest model in a well-monitored pipeline can be trusted and repaired; a brilliant model in a leaky, unmonitored pipeline cannot even be believed.
:::

:::counter title="Objection: the model sometimes is the breakthrough" to="The data-and-plumbing thesis"
The strongest reply is that this thesis quietly assumes a mature, ordinary problem — and that assumption fails exactly where the field moves. The leaps that defined the last decade came overwhelmingly from modelling advances: new architectures and training methods unlocked capabilities in language and vision that no amount of data cleaning on the older approaches would have reached, as the next chapter describes. Within a company, too, some problems genuinely are model-bound — the data is clean and plentiful and the older method has simply hit its ceiling. And "data work first" can curdle into an excuse never to master the modelling craft — leaving you unable to recognise the cases where the model *is* the bottleneck. The sensible synthesis is sequencing, not doctrine: baseline first, data and evaluation discipline always — and real modelling depth in reserve for the problems that turn out to deserve it.
:::

:::uncertainty title="How much of the work is data work?"
A widely repeated claim says data scientists spend some large share of their time — 80% is the number usually quoted — on data preparation rather than modelling, and related surveys claim that a large majority of machine-learning projects never reach production. These figures circulate constantly, but they trace back to informal surveys of varying rigour and are hard to pin to a primary study; citation needed — verify before publishing. This book asserts the qualitative point only — data and pipeline work dominates modelling work in typical applied projects — without endorsing any specific percentage.
:::

## 4.6 The unglamorous truth

None of this will make a striking demo. That is rather the point. The engineers whose systems still work in year three are the ones who framed the problem before reaching for a model, distrusted their labels, guarded the test set like an examiner, built the boring baseline, chose metrics by asking which mistake hurts whom — and treated a too-good result as an accusation rather than a triumph. Chapter 2 gave you the scientific reasons these systems fail; this chapter gave you the organisational ones. The next chapter takes on the systems that made the whole world look up from its phones — and every discipline learned here transfers directly.

:::reflect
Take a dataset you have actually touched — at work, in a course project, anywhere. Write down one way leakage could plausibly enter it (what column or timestamp could smuggle the future into the features?), and one way its labels could be wrong in a *patterned* rather than random way. If you cannot name either, write down what you would need to know about how the data was collected to answer, and who you would have to ask. Interrogating provenance before modelling is the cheapest professional edge this chapter can give you.
:::

[^sculley]: D. Sculley and colleagues, "Hidden Technical Debt in Machine Learning Systems," in *Advances in Neural Information Processing Systems* (NeurIPS, 2015) — the well-known practitioner account of production ML as a small learning core inside a large system of data, configuration, and monitoring. Cited for its qualitative argument; consult the paper itself for specifics.
[^goodhart]: The pattern — a measure that becomes a target ceases to be a good measure — is commonly called Goodhart's Law, after economist Charles Goodhart's observation about monetary policy targets. Cited here as a widely known aphorism and its standard attribution, not a precise quotation.

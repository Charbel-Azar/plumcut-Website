---
title: How to Run One AI Across Several Stores on WhatsApp, Instagram and Messenger
description: One engine, many front doors. How a business with several shops or brands runs the same AI on every WhatsApp number, Instagram account and Facebook Page.
date: 2026-09-25
slug: one-ai-multiple-stores-channels
type: general
keywords: [one chatbot for multiple stores, multi store WhatsApp automation, WhatsApp Instagram Messenger one inbox, multi brand customer service automation, AI for multiple shops, omnichannel chatbot MENA]
hero: /blog/heroes/clothing-rail-store.jpg
heroAlt: A rail of clothes inside a retail store
heroCredit: Random Retail
heroCreditUrl: https://www.flickr.com/photos/67408512@N03
heroSource: Flickr
heroLicense: CC BY 2.0
heroLicenseUrl: https://creativecommons.org/licenses/by/2.0/
related: [whatsapp-ai-that-takes-action-mena, too-many-customer-messages-retail, ai-customer-service-retail]
ctaLine: Running several stores or brands on WhatsApp, Instagram and Messenger? Ask plum how one system could answer and sell for all of them, each in its own voice.
faq:
  - q: Can one chatbot answer for several stores or brands at once?
    a: Yes, if it is built as one engine with separate front doors. The shared engine holds the language skills, the policies common to every store and the connections to stock, orders and couriers. Each store keeps its own WhatsApp number, Instagram account or Facebook Page, its own name and tone, its own catalogue, prices, opening hours and delivery areas. The system knows which store a message belongs to from the number, account or Page it arrived on, so the customer only ever talks to the brand they chose.
  - q: How many WhatsApp numbers can one business have on the WhatsApp Business Platform?
    a: Meta's documentation, checked on 25 September 2026, says a new business portfolio is capped at two registered business phone numbers, and the cap rises automatically to 20 once the business is verified or reaches a messaging limit of 2,000. A portfolio can initially hold up to 20 WhatsApp Business Accounts. Messaging limits are set at the portfolio level and shared by every number in it, so one store's large broadcast can use up capacity the other stores needed that day.
  - q: Does a customer who messages two of my stores count as one person?
    a: Not automatically. Messenger gives each person a Page scoped ID and Instagram gives an Instagram scoped ID, and both are unique to the Page or account being messaged, so the same shopper messaging two of your Instagram accounts arrives as two different IDs. On WhatsApp, Meta's business scoped user IDs, which began appearing in webhooks in April 2026, are unique per business portfolio, so numbers in the same portfolio see the same ID. Linking one person across channels still depends on a phone number or email captured in the conversation or already held in your own systems.
  - q: How long do I have to reply on WhatsApp, Instagram and Messenger?
    a: All three give a 24 hour window after the customer's last message. On Messenger and Instagram, a human agent tag lets a person, not an automated reply, respond within 7 days of the customer's message. On WhatsApp, messages outside the 24 hour window have to use a template Meta has approved. Automated replies should therefore be fast enough that the window is rarely the problem, with a clear handover when a human needs more time.
  - q: Should every store share the same WhatsApp number?
    a: Usually not. A shared number makes every store look like one brand, mixes their promotions and their customer history, and lets one store's complaints or blocks affect the rating of a number the others depend on. Separate numbers per store or brand, connected to one shared engine, keep each identity clean while the logic, the integrations and the reporting stay in one place. One number for several branches of the same brand is a reasonable exception.
---

A business with one shop has one inbox. A business with five shops usually has five WhatsApp numbers, four Instagram accounts, three Facebook Pages, and a different person or a different basic bot answering each of them. Customers get different answers to the same question depending on which door they knocked on, stock questions land at the wrong branch, and nobody can see the whole picture.

> Yes, one AI can answer and sell for every store and every channel. The design that works is one engine with many front doors. The engine holds the language skills, the shared rules and the connections to stock, orders and couriers. Each store keeps its own WhatsApp number, Instagram account or Facebook Page, its own name and voice, its own catalogue, prices, hours and delivery areas. The system knows which store a message belongs to from where it arrived, answers as that store, and reports back to one dashboard. What it should not be is one number and one personality stretched across every brand.

## What "the same bot" should and should not mean

"One bot for all our shops" is the right goal and the wrong picture. Customers do not want a group chatbot. They want the store they messaged to answer, quickly and correctly. The sharing happens behind the counter, not in front of it.

| Shared across every store | Kept separate for each store |
| --- | --- |
| The engine that reads and writes Arabic, Arabizi and English | The name, tone and greeting the customer sees |
| Policies that are the same everywhere, such as returns or payment methods | Catalogue, prices and promotions |
| The connections to stock, order, payment and courier systems | Which branch or warehouse holds the stock |
| The dashboard, the conversation history and the reporting | Opening hours, delivery areas and delivery fees |
| The rules for when a human takes over | Which team receives that handover |

Get this split right and adding a new store is mostly configuration: a new number or account, a new catalogue feed, a new set of rules. Get it wrong and every store becomes its own project.

## How the three channels actually connect

WhatsApp, Instagram and Messenger all belong to Meta, but they connect differently, and a multi store setup has to respect each one's rules. Everything below was checked against Meta's developer documentation on 25 September 2026.

| Channel | What each store connects | Reply window | Outside the window |
| --- | --- | --- | --- |
| WhatsApp | A business phone number, inside a WhatsApp Business Account, inside a business portfolio | 24 hours from the customer's last message | Only templates Meta has approved |
| Instagram | An Instagram professional account, with or without a linked Facebook Page | 24 hours | A human agent tag allows a person to reply within 7 days |
| Messenger | A Facebook Page | 24 hours | A human agent tag allows a person to reply within 7 days |

**WhatsApp numbers have a ceiling you will meet.** Meta's [phone number documentation](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers) says a new business portfolio is capped at two registered business phone numbers, rising automatically to 20 once the business is verified or reaches a messaging limit of 2,000. The [WhatsApp Business Accounts](https://developers.facebook.com/documentation/business-messaging/whatsapp/whatsapp-business-accounts/) page says a portfolio can initially hold 20 of those accounts, and that each account belongs to exactly one portfolio. For a business with six stores, verification is not paperwork you do later. It is the step that lets the third store exist.

**Messaging limits are shared.** Meta's [messaging limits documentation](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits) states that limits are set at the business portfolio level and shared by all business phone numbers in it. A new portfolio starts at 250 unique customers per rolling 24 hours for messages sent outside a customer service window, with higher tiers of 2,000, 10,000, 100,000 and unlimited. Replies inside the 24 hour window do not count. Broadcasts do. So if one store sends a big promotion on a Friday, it can use up the capacity the other stores needed for their own messages that day. Plan broadcasts at group level, not store by store.

**Instagram no longer needs a Facebook Page.** Meta's [Instagram platform overview](https://developers.facebook.com/docs/instagram-platform/overview/) describes two setups: Instagram API with Instagram Login, for professional accounts that exist only on Instagram, and Instagram API with Facebook Login, for accounts linked to a Page. Both support messaging. That matters for businesses whose smaller stores only ever opened an Instagram account.

**Automated replies should say they are automated where the law asks for it.** Meta's [Messenger and Instagram messaging policy](https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy) requires automated chat to disclose that it is automated where legally required, and recommends doing so anyway. The same policy sets the 24 hour window and the 7 day human agent tag above.

## How the system knows which store a message is for

Routing is the part people underestimate. A good multi store setup decides in this order.

1. **Where the message arrived.** The number, account or Page tells you the store, and therefore the voice, the catalogue and the rules. This settles most messages on its own.
2. **Where the customer is.** For a brand with several branches on one number, the delivery area or the nearest branch decides who fulfils the order.
3. **Where the stock is.** If the item is out of stock at the store that was messaged, the system checks the others, if you allow that.

A hypothetical example to make it concrete. A customer messages the Instagram account of one of your shops asking for a size that shop has sold out of. A single store bot says sorry. A group setup can see the same item at another of your branches and offer to deliver it from there, in the voice of the shop the customer chose, with the order created at the branch that holds it. Whether you allow that is a business decision. Whether the system can do it depends on whether it was connected to stock across stores in the first place.

## One customer, many doors

Most businesses assume a customer who messages two of their stores is one person in their system. On Meta's channels, that is not automatic.

Meta's messaging documentation says each person who messages a Facebook Page or an Instagram professional account gets an ID scoped to that Page or account: a Page scoped ID on [Messenger](https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages), an Instagram scoped ID on [Instagram](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/). The same shopper messaging two of your Instagram accounts arrives as two different IDs.

WhatsApp is moving the other way. Its [business scoped user IDs](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/), introduced because WhatsApp users can now choose a username instead of showing their phone number, began appearing in webhooks in early April 2026. They are unique to each business portfolio and user pair, so every number in the same portfolio sees the same person as the same ID. Numbers in a different portfolio see a different ID.

The practical rule: if you want one customer profile across stores and channels, you have to build the link. The usual key is a phone number or email captured naturally in the conversation, when the customer places an order or asks for delivery, and matched against what your own systems already hold. Keep it honest in both directions. A profile built from the first message forward is solid. Linking someone to purchases you cannot prove were theirs is not.

## Tools that already handle several brands in one place

If what you need is one inbox for several stores, with people answering, several platforms do it. We checked each vendor's own page on 25 September 2026. plumcut publishes this list and is one of the options on it.

| Tool | What it documents for several stores or brands |
| --- | --- |
| [Meta Business Suite Inbox](https://www.facebook.com/business/help/294426838452244) | Messages and comments from a Facebook Page, Messenger, Instagram and WhatsApp in one inbox, with basic automated responses |
| [Zendesk](https://support.zendesk.com/hc/en-us/articles/4408829476378-Setting-up-multiple-brands) | Up to five brands on Suite Growth and Professional, up to 300 on Enterprise plans, with a WhatsApp channel associated to a brand at setup |
| [Gorgias](https://docs.gorgias.com/en-US/manage-multiple-stores-in-gorgias-1905893) | Several Shopify, BigCommerce or Magento 2 stores in one helpdesk, with channels managed store by store; its [multi store page](https://www.gorgias.com/product/multi-stores) says all plans include unlimited brands |
| [respond.io](https://respond.io/faqs/is-respondio-right-for-multiple-brands-one-operation) | A workspace per brand, each with its own channels, contacts, history, workflows and AI Agents, on the Advanced plan at $279 a month per its [pricing page](https://respond.io/pricing) |
| [SleekFlow](https://help.sleekflow.io/en_US/connecting-channels) | Several WhatsApp numbers plus Instagram and Messenger accounts connected to one account and one inbox |
| [Freshdesk](https://support.freshdesk.com/support/solutions/articles/37638-supporting-multiple-products-with-freshdesk) | Separate branded portals for several products or brands from one helpdesk |
| [plumcut](/solutions) | One engine answering and selling for every store and channel, connected to stock, orders and couriers, built and run for you |

Each of these solves the inbox problem well. What they leave to you is the logic in the section above: which store holds the stock, how an order gets created at the right branch, how the courier gets told, and who maintains all of that when a system changes. That is the part that decides whether "one bot for all our stores" saves anyone any work.

## Where multi store setups break

Five failures come up again and again, and all of them are design decisions rather than bugs.

- **One number for several brands.** It saves setup time and costs you every brand's identity. Complaints or blocks on that number affect all of them.
- **One stock feed without locations.** The system tells a customer the item is available, and it is, in a branch 40 minutes away that does not deliver to them.
- **Broadcasts planned store by store.** Shared messaging limits mean one store's campaign can crowd out another's order updates.
- **Handover to a shared inbox.** When the conversation needs a human, it has to go to the team that can act for that store, with the context attached, not to a general queue.
- **Reporting that mixes everything.** A group dashboard is useful only if you can also see each store on its own. Otherwise you cannot tell which shop is losing sales in its conversations.

## Why this matters more in MENA

Two regional realities make the single engine more valuable here than in most markets. First, customers write in Arabic, English, Arabizi and every mix of the three, often in the same message, which we cover in [our guide to Arabic customer service](/blog/ai-customer-service-arabic). Teaching that once, in one engine, is far cheaper than teaching it separately to five store bots. Second, WhatsApp is where buying happens, not just where support happens. DataReportal's [Digital 2026 Saudi Arabia](https://datareportal.com/reports/digital-2026-saudi-arabia) report puts WhatsApp use at 92.2 percent of internet users. When every store's sales run through the same channel, a weak link in one store is a lost order, not a slow ticket.

## How plumcut does it

plum runs as one system across all of your stores and channels. Each store keeps its own WhatsApp number, Instagram account and Facebook Page, its own name and voice, and its own catalogue and rules. Behind them, plum is connected to what the business already runs on, so it can check stock, create orders at the right branch, take payment and follow up with delivery, as set out in [how it works](/how-it-works). You get one dashboard with every conversation, a profile for each customer, and human takeover whenever a person should step in.

We build it, run it and keep it working, so adding a store is our job, not yours. Pricing is a setup fee and a fixed monthly fee set by what the solution does, with Meta messaging and AI usage billed at cost, as shown on [pricing](/pricing). Adding stores changes the scope, and you see the new figure before you agree to it.

**When we are not the right answer.** If all you need is one shared inbox where your team answers every store by hand, Meta Business Suite is free and Gorgias or respond.io will organise it well. If you have an in house team that wants to build the routing and integrations itself, a platform will cost you less. We fit the business that wants the stores answered and the orders created without adding a person per shop.

## What to do this week

1. **List every door.** Every WhatsApp number, Instagram account and Facebook Page, per store, and who answers each today.
2. **Draw the split.** Use the table at the top of this post and decide what is shared and what belongs to each store.
3. **Find where stock lives.** For each store, which system knows what is on the shelf, and can anything read it?
4. **Check your Meta setup.** Is the business verified, and are all the numbers in one portfolio? That decides how many numbers you can add and how broadcast capacity is shared.
5. **Pick one busy store to start.** Busy enough that the results are obvious, simple enough to launch in weeks. Then copy the pattern to the rest.

If you run a group of brands rather than a group of branches, the decisions above sit inside a bigger one about how to buy and roll this out across the group. We cover that in [how holding companies can automate customer conversations across their brands](/blog/holding-company-conversation-automation).

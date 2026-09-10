---
title: "SMS or WhatsApp for Delivery Notifications: Which Should You Use?"
description: "A channel comparison for delivery updates in Lebanon and the Gulf: what each costs, what it takes to switch on, and which one survives the customer reply."
date: 2026-09-10
slug: sms-vs-whatsapp-delivery-notifications
type: comparison
keywords: [SMS vs WhatsApp delivery notifications, order tracking SMS or WhatsApp, delivery notification cost, WhatsApp utility template pricing, SMS sender ID UAE]
hero: /blog/heroes/notebook-and-phone.jpg
heroAlt: A notebook and a phone side by side on a desk
heroCredit: Sancho Papa
heroCreditUrl: https://www.flickr.com/photos/46097475@N00
heroSource: Flickr
heroLicense: CC BY 2.0
heroLicenseUrl: https://creativecommons.org/licenses/by/2.0/
related: [automate-logistics-delivery-updates, where-is-my-order-whatsapp, whatsapp-business-api-cost]
ctaLine: Deciding how to send delivery updates? Ask plum what a WhatsApp notification loop with an SMS fallback would cost for your order volume.
faq:
  - q: Is WhatsApp cheaper than SMS for delivery notifications?
    a: "Usually, but not because the unit price is lower. Both charge you for the message you send first. The difference is everything after it. SMS bills every message including the ones you send to answer a question, while on WhatsApp a customer's reply opens a 24 hour customer service window, and since 1 July 2025 Meta does not charge for service messages inside that window or for utility templates sent in response to a user. If your dispatch notification produces conversations, WhatsApp bills one message per order and SMS bills the whole exchange. If it produces nothing but silence, the two are close and you should compare the current rate cards for your market."
  - q: Can a customer reply to an SMS delivery notification?
    a: "Not when it comes from an alphanumeric sender name, which is how most branded notification SMS is sent in this region. Alphanumeric sender IDs are one way by design and recipients cannot reply to them. Providers note that because customers cannot even send STOP, you have to give them another way to opt out. If you want replies you need a real number, which is a separate registration with its own rules per country."
  - q: What does it take to start sending notification SMS in the UAE or Saudi Arabia?
    a: "A registered sender ID, and it is paperwork rather than code. UAE operators require registration documents that depend on where your company is based and where the traffic originates, and the UAE regulator applied new fees for international alphanumeric sender IDs from 1 January 2025, which providers pass on. Twilio, for example, lists a one time setup fee of 225 dollars per international sender ID and 115 dollars per month to keep it. Saudi Arabia has its own registration, and Mobily stopped supporting promotional sender ID registration in April 2024."
  - q: Do I need customer opt in for WhatsApp delivery updates?
    a: "Yes. Meta's business messaging policy requires an opt in before you message someone, it has to name your business, and it can be collected outside WhatsApp as long as you follow local law. You also cannot open the conversation with free text: a business initiated message has to use a template approved in advance, categorised by what it does, with delivery updates falling under utility."
  - q: When is SMS still the right channel for an order update?
    a: "When the message has to arrive whether or not the person uses WhatsApp, when it needs no reply, and when a data connection cannot be assumed. One time passwords, a hard cutoff notice, and the fallback for a customer whose WhatsApp template did not get delivered are all good SMS. Most stores end up running both rather than choosing, with WhatsApp as the default and SMS behind it."
  - q: Does a delivered notification mean the parcel arrived?
    a: "No, on either channel. A delivery receipt describes your message, not your shipment. Track parcel state from your courier's data and message state from your messaging provider, and never let one stand in for the other in a customer facing reply."
---

You are about to send a dispatch notification to a customer in Beirut or Dubai. The parcel is with the courier, the tracking reference exists, and the only question left is which channel carries the message. Most stores answer it on price per message, then discover the real cost three days later, when the customer replies "can you make it Thursday instead" and nobody sees it.

> For a store selling in Lebanon and the Gulf, WhatsApp should be the default channel for delivery updates and SMS should be the fallback, and the reason is the reply rather than the price. Branded notification SMS is sent from an alphanumeric sender name, which is one way by design: the customer cannot answer it, so every question your notification provokes lands somewhere else, or nowhere. On WhatsApp the notification and the answer live in the same thread, and the cost model rewards that. Both channels bill the message you send first. After that they diverge: SMS charges for every message you send, while a customer reply on WhatsApp opens a 24 hour customer service window in which Meta has not charged for service messages since 1 July 2025. Keep SMS for what it is genuinely better at, which is reaching a phone with no WhatsApp, no data, and no need to reply.

## The comparison that actually decides it

Delivery notifications are not broadcasts. They are the most reply provoking messages a store sends, because they carry a time, a place and an amount, and all three are things a customer might need to change. So compare the channels on what happens after the send, not on the send.

| | Notification SMS | WhatsApp Business Platform |
| --- | --- | --- |
| Can the customer reply | No, from an alphanumeric sender name. Yes only from a registered number, which is a separate setup | Yes, in the same thread |
| Who sees the reply | Whoever owns the reply number, if one exists | The same inbox that sent the update |
| What you pay for | Every message you send | The template you send first, plus nothing for service replies inside the window the customer opened |
| Opening the conversation | Free text, subject to sender ID rules | An approved template, in a category, with opt in on file |
| Setup before message one | Sender ID registration per country, with documents and recurring fees | A WhatsApp Business account, a number, an approved template, and opt in |
| What it can carry | 160 characters per segment, a link if you must | Formatted text, a tracking link, buttons the customer can press |
| Best at | One way, no reply expected, no data connection | Anything the customer might answer |

The row that matters is the first one. Providers are explicit that alphanumeric sender IDs support one way messaging only and that recipients cannot reply, to the point that customers cannot even send STOP, so you have to supply a separate opt out mechanism. That is fine for a one time password. For a message that says a driver is coming to your house tomorrow between two and six and will ask you for 90 dollars, it is a design flaw.

## What each one costs, honestly

Both channels charge you to start the conversation. The published numbers below are one provider's public list prices for a market, checked on 10 September 2026, not what a store pays at volume and not a quote. Check the current pages before you build a budget on them.

**SMS.** Twilio's public rate card lists outbound SMS to the United Arab Emirates at 0.1092 dollars per message across Etisalat, du and other carriers, with Saudi Arabia listed lower, around 0.087. There is also a failed message processing fee of 0.001 dollars on messages that end in a failed status, which is small until a bad list makes it not small. On top of the per message price sits the sender ID: from 1 January 2025 the UAE regulator applied new fees for international alphanumeric sender IDs, and Twilio passes these on as a one time setup fee of 225 dollars per international sender ID and 115 dollars a month to keep it. That is a fixed cost you pay whether you send ten messages or ten thousand.

**WhatsApp.** Meta bills per message, by template category and by the recipient's country calling code, and the current rate cards took effect on 1 July 2026, with further pricing updates announced for 1 August and 1 October 2026. Delivery updates fall in the utility category. Two rules do most of the work on your bill: since 1 July 2025 Meta does not charge for utility templates delivered in response to a user, and service messages sent inside the 24 hour customer service window a customer opens are not charged either. We went through the full picture in [what the WhatsApp Business API really costs](/blog/whatsapp-business-api-cost).

Put those together and the comparison stops being about unit price. A dispatch notification that gets a reply costs you one paid message on WhatsApp and the entire back and forth on SMS, on a channel where the back and forth cannot happen in the first place. A dispatch notification that gets no reply costs roughly the same on both, and you should read the two current rate cards for your own markets rather than trust a ratio from an article.

## What it takes to switch either one on

Neither is instant, and the work is different in kind.

SMS is paperwork. UAE operators require registration documents that vary with where your company is registered and where the traffic originates, and there is a per country process behind each market you want to reach. Saudi Arabia runs its own registration, and Mobily stopped supporting promotional sender ID registration in April 2024, which is the sort of change that arrives without warning and reshapes what you can send. None of this is hard. It is just slow, repeated per country, and never finished.

WhatsApp is policy and product. You need a WhatsApp Business account and a number, an opt in that names your business, collected anywhere as long as local law allows, and a template approved in advance for anything you send first. Meta validates the category you chose against what the template actually says. The template is the part stores underestimate: it is a fixed shape with variables, so the wording of your dispatch notification is a decision you make once and live with, not a string you edit per order.

## The failed delivery attempt is the case that settles it

Every logistics operation has a happy path that either channel handles. The channel is chosen by the bad path.

A delivery attempt fails. The driver marks it, your system sees it, and now something has to happen within hours or the parcel goes back and, on cash on delivery, the sale goes with it. The message you need to send is not a notification, it is a question: is tomorrow morning better, or should we hold it at the branch. On SMS from a sender name, that question has no return path, so it becomes a phone call somebody has to make. On WhatsApp it is a message with two buttons, and the answer arrives in the same thread, inside a window where your follow up costs nothing.

That is the whole argument compressed into one event. We covered the operational side of that loop, including why courier status data is the weak link, in [automating delivery updates and the courier loop](/blog/automate-logistics-delivery-updates), and the customer facing half in [can AI answer where is my order on WhatsApp](/blog/where-is-my-order-whatsapp).

## Where SMS still earns its place

This is not a case for deleting SMS, and a comparison that ends with one channel winning everything is usually selling something. Keep SMS for:

- **One time passwords and codes.** No reply needed, and the customer wants it in the notification shade, not in a chat.
- **Customers with no WhatsApp.** They exist in every market and they still bought something.
- **Fallback when a WhatsApp template is not delivered.** If a utility template sits undelivered past a threshold you set, an SMS with the same information is a reasonable second attempt.
- **Hard operational notices that must not invite a conversation.** Occasionally the absence of a reply path is the feature.

Most stores that get this right run both, with WhatsApp as the default and SMS behind it, rather than picking a winner. The decision you are actually making is which one is the default.

## Where plum fits

plumcut is a conversation layer for commerce brands on WhatsApp, so treat this section as an interested party describing its own category. We publish comparisons that feature us, and the honest boundary is this: if your notifications genuinely need no reply, an SMS provider is the simpler purchase and you do not need us for it.

What plum handles is the case above, where the update and the conversation are the same thing. Order events come in from your store or your delivery software, the update goes out as a utility template, and the reply it produces is read and answered in the same thread, in Arabizi and English as customers actually write, with a handover to a human on anything that should not be automatic. That is the [solutions](/solutions) page in one paragraph.

## What to do this week

1. Count how many replies your delivery notifications currently produce, and where they land. If the answer is "we do not know", that is the finding.
2. Open the current rate card for your two biggest markets on both channels and write down the utility rate and the SMS rate side by side. Use today's numbers, not a figure from an article, this one included.
3. Add up your fixed SMS cost, the sender ID setup and monthly fees per country, and put it next to your monthly message spend. For low volume senders it is often the larger number.
4. Pick the single event most likely to need a reply, which is almost always the failed delivery attempt, and move that one message to WhatsApp first. Leave everything else where it is until that one works.

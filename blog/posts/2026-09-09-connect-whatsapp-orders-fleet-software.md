---
title: How to Connect WhatsApp Orders to Your Fleet Management Software
slug: connect-whatsapp-orders-fleet-software
description: "What it takes for an order placed in a WhatsApp conversation to appear in a fleet dashboard by itself, and how logistics vendors can offer it."
type: direct
date: 2026-09-09
related: [manual-order-entry-vs-automated-capture, automate-logistics-delivery-updates, where-is-my-order-whatsapp]
ctaLine: Run a fleet platform or use one? Ask plum what a conversational order layer on top of it would look like.
keywords: [WhatsApp order integration, fleet management software integration, logistics SaaS WhatsApp, automate order creation API, delivery software integration]
hero: /blog/heroes/sealed-box.jpg
heroAlt: A sealed cardboard box ready to ship
heroCredit: public.resource.org
heroCreditUrl: https://www.flickr.com/photos/8212496@N06
heroSource: Flickr
heroLicense: CC0 1.0
heroLicenseUrl: https://creativecommons.org/publicdomain/zero/1.0/
notionUrl: https://app.notion.com/p/3d68d6e734f48172bcbce82d0348c392
faq:
  - q: What does it take to create an order in fleet software from a WhatsApp message?
    a: Four things. A WhatsApp Business API number so a system can receive and send messages, a layer that reads the conversation and extracts the order fields, a validation step that refuses to create an order it cannot dispatch, and an authenticated call to your platform's create job endpoint carrying your own reference so the order cannot be duplicated. The platform's status webhooks then close the loop by pushing updates back into the same thread.
  - q: Can this work if my logistics platform is custom built rather than off the shelf?
    a: Yes, and it is often easier. A custom platform means the team that owns the database can add a create order endpoint and a status webhook shaped exactly the way the conversation layer needs them, instead of you working around a vendor's field names. What matters is that something authenticated exists to write an order and something exists to tell you when its status changes.
  - q: Should a logistics software company build conversational ordering itself or partner?
    a: It depends on whether conversation is your product. Message handling is not a feature you ship once. It is a live surface with template approvals, a 24 hour reply window, per market pricing, and language behaviour that has to survive real customers writing badly. If your roadmap is routing, dispatch and proof of delivery, the honest comparison is between a partner who maintains that surface and the engineering months you would spend maintaining it yourself.
  - q: What stops a duplicate order being created when a customer repeats themselves?
    a: An idempotency reference generated from the conversation and sent with the create call, so a second attempt with the same reference updates rather than creates. Delivery platforms generally let you attach your own external identifier to a job for exactly this purpose. Without it, a customer who says "yes, confirm" twice produces two dispatches, and that is the most common way an integration like this loses money.
  - q: Does the customer have to leave WhatsApp at any point?
    a: No, that is the point of doing it this way. The order is captured in the thread, the order number is returned into the same thread, and status changes arrive there too. Sending the customer to a portal or a form reintroduces exactly the step that made people reply in the chat in the first place.
  - q: How are order notifications billed on WhatsApp?
    a: A message you send first, outside an open customer service window, is a template message billed at the rate for that customer's market, while replies inside the 24 hour window the customer opened are not charged. Rates are market specific and Meta has revised its rate card, so check the current card rather than a figure quoted in an article. We covered the detail in our piece on what the WhatsApp Business API really costs.
---

You sell or run software that dispatches drivers. It routes, it assigns, it captures proof of delivery, and it does all of that well. Then an order arrives on WhatsApp and a human opens the dashboard and types it in. The gap is not in your software. It is between the conversation where the order happens and the system where the order lives, and it is the same gap in almost every fleet and delivery platform we have looked at.

> Closing it takes four pieces: a WhatsApp Business API number, a layer that reads the thread and extracts the order fields, a validation step that refuses to create anything it cannot dispatch, and an authenticated call to your platform's create job endpoint carrying your own reference so nothing gets created twice. The platform's existing status webhooks then push updates back into the same conversation. Nothing here is exotic. Established delivery platforms already document the endpoints and webhooks this needs, because it is the same route their store and ERP integrations use. The hard part is not the API call. It is the validation rules and the handover path for the orders that should not be automatic.

## The shape of the integration

Five steps, in order. Only step four touches your dispatch system.

**1. Receive.** The customer writes. That message reaches your stack through the WhatsApp Business API rather than a phone in someone's hand, which is what makes any of this possible.

**2. Understand.** The layer reads the thread, not just the last message, and pulls out the fields an order needs: who is ordering, the delivery address, what is being sent or bought, the requested time, and how it is being paid. In this region that means reading Arabizi written in Latin script as fluently as English, because that is how a real customer writes.

**3. Validate and complete.** This is the step that decides whether the whole thing is an asset or a liability. Before anything is created, the layer checks each field against rules you can state out loud. Anything missing becomes one specific question in the chat. Anything unusual goes to a person with the conversation attached.

**4. Create.** An authenticated call to your platform's create job endpoint, carrying an idempotency reference derived from the conversation so a customer confirming twice does not produce two dispatches.

**5. Confirm and close the loop.** The order number comes back into the same thread. Then the platform's status webhooks feed dispatch, delivery and failure events back into that conversation, which is the half we covered in [automating delivery updates and the courier loop](/blog/automate-logistics-delivery-updates).

## What your platform has to expose

Two things, and most established platforms already have both.

**A way to create a job.** An authenticated endpoint that accepts an order and returns an identifier. Onfleet documents a REST API for creating and managing tasks, authenticated with an organization API key ([Onfleet tasks reference](https://docs.onfleet.com/reference/tasks)). Track-POD documents an order import API alongside its integrations ([Track-POD API](https://api.track-pod.com/index.html)). Detrack documents a REST API with job creation and proof of delivery data ([Detrack API](https://detrackapiv2.docs.apiary.io/)). Shipday documents a JSON REST API for orders and drivers ([Shipday API](https://docs.shipday.com/reference/shipday-api)).

**A way to hear about status changes.** Webhooks that POST to your endpoint when something happens to the job. Onfleet fires webhooks on task events, delivered as POST requests carrying the trigger that caused them ([Onfleet webhooks](https://docs.onfleet.com/reference/webhooks)). Track-POD documents webhook events including create order, update order status and route events. Detrack and Shipday both document status webhooks, and Shipday's order status webhook supports a validation token sent in the request header.

Checked September 2026. Vendor capabilities and plan availability change, so confirm against your platform's current documentation rather than this list.

If your platform is custom built, this is easier rather than harder. The team that owns the database can shape both sides to fit.

## The five fields that decide whether it works

Everything else is detail. These five are where a conversational order either becomes dispatchable or becomes a problem for a driver at 4pm.

| Field | Why it breaks | What the validation has to do |
| --- | --- | --- |
| Address | People give landmarks, not addresses, and in much of the region there is no reliable street numbering | Require enough specificity to actually route, and ask for the missing piece rather than accepting "near the pharmacy" |
| Phone number | Wrong country code, missing digit, or a number the driver cannot reach | Normalise to a callable format and confirm it belongs to the recipient, who is often not the person chatting |
| Time window | The customer asks for a slot you do not serve | Check against the windows dispatch can actually offer before promising one |
| Payment and amount | Cash on delivery means the driver collects, so a wrong amount is a wrong collection | State amount and currency explicitly in the confirmation, and never infer it |
| The item itself | Ambiguous quantity or a product that needs special handling | Resolve against your catalogue, and hand over when it cannot be resolved |

Write these rules down before building anything. If your team cannot state them, the automation will encode whatever it guesses, and it will do that quickly and consistently, which is the worst possible combination.

## The handover path is a feature, not a fallback

An order the layer should not create is a success when it reaches a person cleanly. Design three outcomes rather than two: create it, ask one question, or hand it to a human with the full conversation attached and a note on what was unclear.

Then watch the handover rate and the reasons behind it. That list is the honest backlog. The first month it will be full of address ambiguity. Fix that, and it moves to something else. An integration with a zero percent handover rate is not a good one, it is one that is quietly creating orders it should have questioned.

## Two ways this gets bought

The same integration, two commercial shapes, and it is worth being explicit about which one you are.

**You operate the fleet.** You run a delivery business or a brand with your own drivers, you already pay for a fleet platform, and your team retypes orders into it. The conversational layer connects to the platform you already run. Nothing about your dispatch changes, and the comparison against your current process is laid out in [manual order entry versus automated capture](/blog/manual-order-entry-vs-automated-capture).

**You sell the software.** You are the vendor. Your clients have their own fleets and their own customers, and every one of them has staff doing manual order entry into your dashboard. That gap is a feature request you keep hearing and a roadmap item you keep deferring, because conversation is not what your product is about.

For a vendor, the build or partner decision is not really about the API call, which is a week of work. It is about the surface underneath it. Message templates need approval and get rejected. The 24 hour reply window governs what you can send and when. Pricing is per market and changes. Language behaviour has to hold up against customers writing in Arabizi, in fragments, and out of order. That is a product someone has to own continuously, not a feature you ship once. If your roadmap is routing, dispatch and proof of delivery, the fair comparison is between a partner maintaining that surface and the engineering months you would spend maintaining it yourself, forever, alongside everything else.

## What plumcut does here

plum is the conversation layer, not the dashboard. It handles the customer thread on WhatsApp, in English and in Arabizi, captures the order out of the customer's own words, validates it against rules you set, creates it in the fleet or delivery platform you already run through that platform's API, and returns the order number into the same thread. Your dispatch system stays the system of record and your team stops re-keying.

We work both routes above: directly with operators, and with logistics software vendors who want to offer conversational ordering to their own client base as part of their product rather than building and maintaining a messaging stack. [Solutions](/solutions) covers what plum handles, [how it works](/how-it-works) covers the mechanics, and [pricing](/pricing) covers what running it costs. The messaging cost side, which is separate from what a vendor or operator pays us, is broken down in [what the WhatsApp Business API really costs](/blog/whatsapp-business-api-cost).

## What to do this week

Open your platform's API documentation and answer two questions: can something authenticated create a job, and can something tell me when that job's status changes. That is the whole feasibility study, and it takes fifteen minutes.

Then, separately, write down the validation rules your best order-entry person applies without thinking about them. What makes an address dispatchable. Which time windows you actually serve. What you do when the cash on delivery amount looks wrong. That document is worth more to this project than any piece of the integration, because it is the part that cannot be bought.

// Invented demo calls for `npm run seed:demo`. Every name, address and line here is made up,
// so the app can be shown (deployed demo, screen recordings) without any real customer data.
// Each call covers a different type and outcome, so every page has something to show.

type Line = [speaker: "employee" | "customer", text: string];

export interface DemoCall {
  fileName: string;
  daysAgo: number;
  lines: Line[];
}

export const DEMO_CALLS: DemoCall[] = [
  {
    fileName: "Demo - ants in the kitchen (new customer).mp3",
    daysAgo: 0,
    lines: [
      ["employee", "Thanks for calling Brightside Pest Control, this is Jordan. How can I help you today?"],
      ["customer", "Hi Jordan, I've got ants all over my kitchen counters and I'm kind of at my wit's end."],
      ["employee", "Oh no, I'm sorry, ants on the counters where you cook is the worst. I can definitely take care of that for you."],
      ["employee", "I'm just going to ask you a few questions so I can make sure we get you the right plan, sound good?"],
      ["customer", "Sure."],
      ["employee", "When did you first start seeing them, and where do they seem to be coming from?"],
      ["customer", "About a week ago. They come in under the back door and go straight for the sink. I have two kids and a dog, so I'm worried about sprays."],
      ["employee", "Totally understand. So it sounds like you want the ants gone fast, and something that's safe around the kids and the dog. Does that sound right?"],
      ["customer", "Exactly."],
      ["employee", "Great. I'll walk you through our service, and then we'll talk price and get you scheduled if it sounds good."],
      ["employee", "Your technician will treat the whole foundation outside, so the ants are stopped before they get in. Inside we use pet friendly baits at the back door and under the sink, which take out the colony, not just the ones you see."],
      ["employee", "Then we come back every three months to keep them out, and if you see any ants in between, we come back for free. Any questions so far?"],
      ["customer", "No, that sounds good. How much is it?"],
      ["employee", "Normally the first visit is two hundred ninety nine, but this week we're taking a hundred off for new customers, so it's one ninety nine, and then forty nine a month after that."],
      ["customer", "Hmm, that's a bit more than I was hoping. Another company quoted me less."],
      ["employee", "I hear you, it's smart to compare. If I'm understanding you right, you just want to be sure you're getting real value for the money?"],
      ["customer", "Yeah, pretty much."],
      ["employee", "That makes sense. The big difference is we treat the whole yard and foundation every time and come back free in between, so you won't be paying again if they show up. Would Tuesday morning or Thursday afternoon work better for the first visit?"],
      ["customer", "Tuesday morning works."],
      ["employee", "Perfect. I have you down for Tuesday between eight and ten at 42 Maple Lane. Your technician will call when he's on his way. And if anything else comes up, spiders, wasps, anything, just give us a call first."],
      ["employee", "Thank you so much for calling in today, we really appreciate your business."],
      ["customer", "Thank you, bye."],
    ],
  },
  {
    fileName: "Demo - mice quote, wants to think (new customer).mp3",
    daysAgo: 2,
    lines: [
      ["employee", "Brightside Pest Control, this is Marcus."],
      ["customer", "Hi, I think I have mice in my garage. I hear scratching at night. How much do you charge?"],
      ["employee", "For mice it's usually about two fifty for the first visit."],
      ["customer", "Okay. What does that include?"],
      ["employee", "We put out traps and check them. It depends on what the tech finds."],
      ["customer", "That's more than I thought. I think I need to talk to my husband first."],
      ["employee", "Okay, no problem. Just give us a call back when you're ready."],
      ["customer", "Okay, thanks."],
      ["employee", "Bye."],
    ],
  },
  {
    fileName: "Demo - cancel request, saved with re-service (retention).mp3",
    daysAgo: 3,
    lines: [
      ["employee", "Thanks for calling Brightside, this is Priya."],
      ["customer", "Hi, I'd like to cancel my service please."],
      ["employee", "Absolutely, I can help you with that. What's the address on the account? Let me just take a quick look here."],
      ["customer", "It's 7 Willow Court."],
      ["employee", "Thank you. I see you've been with us about two years and your last visit was three weeks ago. If you don't mind me asking, how has the service been for you?"],
      ["customer", "It was fine until this summer, but I keep seeing spiders on the porch and it feels like I'm paying for nothing."],
      ["employee", "That makes sense, I'm sorry. So the service was good, but lately you're seeing spiders on the porch and it doesn't feel worth it?"],
      ["customer", "Yes, exactly."],
      ["employee", "I totally understand. You've been a loyal customer, so let me offer a couple of options first, and you tell me what you think."],
      ["employee", "I can send our lead technician out this week for a free re-service. He'll sweep the webs and treat the porch, eaves and windows really thoroughly, and I'll put a note on your account so the porch gets extra attention every visit. How does that sound?"],
      ["customer", "Okay, that sounds fair. Let's try that."],
      ["employee", "Great. I have him coming Thursday between one and three. You don't need to be home. Thank you so much for giving us the chance to make it right."],
      ["customer", "Thanks, Priya."],
    ],
  },
  {
    fileName: "Demo - cancelling because moving (retention).mp3",
    daysAgo: 5,
    lines: [
      ["employee", "Brightside Pest Control, this is Marcus."],
      ["customer", "Hi, I need to cancel. We're moving out of state at the end of the month."],
      ["employee", "Okay, I can cancel that. What's the address?"],
      ["customer", "18 Cedar Road."],
      ["employee", "Alright, that's cancelled."],
      ["customer", "Is there any fee?"],
      ["employee", "No, you're past your first year, so no fee."],
      ["customer", "Great, thanks."],
      ["employee", "Okay, bye."],
    ],
  },
  {
    fileName: "Demo - moving an appointment (scheduling).mp3",
    daysAgo: 6,
    lines: [
      ["employee", "Thanks for calling Brightside, this is Priya, how can I help?"],
      ["customer", "Hi, I got a text that my service is tomorrow, but I won't be home and you need to get into the garage."],
      ["employee", "No problem at all, thanks for letting us know ahead of time. I can definitely move that for you."],
      ["employee", "What days work best for you next week, and is morning or afternoon better?"],
      ["customer", "Wednesday or Friday afternoon would be best."],
      ["employee", "Got it, so you need someone there when you're home, Wednesday or Friday afternoon. I have Friday between one and three open. Does that work?"],
      ["customer", "Perfect."],
      ["employee", "You're all set for Friday between one and three. I've added a note that the technician needs access to the garage. Anything else I can help with?"],
      ["customer", "No, that's it."],
      ["employee", "Thanks so much for calling, have a great day."],
    ],
  },
  {
    fileName: "Demo - declined card update (billing).mp3",
    daysAgo: 8,
    lines: [
      ["customer", "Hello?"],
      ["employee", "Hi, this is Jordan with Brightside Pest Control. Is this Sam?"],
      ["customer", "Yes."],
      ["employee", "Hi Sam, I'm just calling because the card on file for your monthly service was declined. I can help you get that updated real quick."],
      ["customer", "Oh, I got a new card last month. Can I give it to you now?"],
      ["employee", "Absolutely. Go ahead whenever you're ready."],
      ["customer", "Okay, I'll read it out."],
      ["employee", "Perfect, I've got that new card saved, and I ran this month's payment, so you're all caught up."],
      ["employee", "You'll get an email receipt in a few minutes. Thanks so much, Sam, have a good one."],
      ["customer", "Thanks, you too."],
    ],
  },
  {
    fileName: "Demo - roaches still showing up (re-service).mp3",
    daysAgo: 12,
    lines: [
      ["employee", "Brightside Pest Control, this is Priya."],
      ["customer", "Hi, you treated for roaches last week, but I'm still seeing a few in the bathroom."],
      ["employee", "I'm sorry you're still seeing them, that's frustrating after a treatment. I'll get this taken care of."],
      ["employee", "Where are you seeing them, and are they big or small?"],
      ["customer", "Small ones, mostly around the bathroom sink at night."],
      ["employee", "That's helpful. Seeing a few in the first couple of weeks is normal while the bait works, but let's not wait. I'll send the technician back for a free re-service to put fresh bait under the sink and seal the gaps around the pipes. Does Monday morning work?"],
      ["customer", "Monday morning is fine."],
      ["employee", "You're booked for Monday between eight and ten, no charge. Thanks for letting us know."],
      ["customer", "Thank you."],
    ],
  },
];

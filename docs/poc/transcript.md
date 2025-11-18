Transcript
Tom (SM): [00:00] Oké team, welkom bij de refinement. We hebben vandaag drie items op de agenda. Sarah, wil jij starten met het eerste item?
Sarah (PO): [00:30] Ja, graag. Dus we hebben veel feedback gekregen van onze key accounts. Ze willen graag een self-service portal waar hun klanten hun orders kunnen volgen zonder elke keer contact op te nemen met support. Nu moeten ze bellen of mailen voor een simpele vraagstatus update.
Mark (BA): [01:15] Oke, en wat voor orders zijn dit precies? Gaat dit alleen om product orders of ook service appointments?
Sarah (PO): [01:30] Goede vraag. In eerste instantie alleen product orders. Service appointments is een tweede fase. We willen dat klanten kunnen inloggen op een portal, hun openstaande en historische orders zien, en de status van elke order kunnen bekijken.
Lisa (Dev): [02:00] En deze klanten, zijn dat de Contacts in Salesforce? Want we hebben nu een vrij complexe account hierarchy met zowel B2B als B2C klanten.
Sarah (PO): [02:15] Ja, precies. Dit gaat om Contacts die gekoppeld zijn aan een Account. Maar nu je het zegt... ik weet niet zeker of we dit voor alle account types willen, of alleen voor bepaalde segmenten.
Tom (SM): [02:40] Misschien iets om uit te zoeken voor we verder gaan. Mark, kun jij dat parkeren?
Mark (BA): [02:45] Zeker. Ik noteer: welke account types krijgen portal toegang? En vraag voor Sarah: moeten B2B gebruikers alle orders van hun account kunnen zien, of alleen hun eigen orders?
Sarah (PO): [03:10] Oh, goed punt. Bij B2B accounts willen we waarschijnlijk dat een inkoopmanager alle orders kan zien, maar een gewone gebruiker alleen zijn eigen. Maar dat moet ik nog verifiëren met legal vanwege GDPR.
Lisa (Dev): [03:40] En voor de technische kant - we hebben al Salesforce Experience Cloud, toch? Of moeten we iets custom bouwen?
Sarah (PO): [03:55] Ja, we hebben Experience Cloud. Ik denk dat we dat kunnen gebruiken. Maar ik weet niet of onze huidige licenties genoeg zijn voor alle klanten.
Lisa (Dev): [04:10] Dat zou ik moeten nakijken. Experience Cloud heeft ook limieten op API calls. Als we veel klanten hebben die constant hun orders refreshen, kunnen we tegen limieten aanlopen. We moeten misschien caching implementeren.
Mark (BA): [04:40] Laten we even schets maken van wat ze moeten kunnen zien. Sarah, je zei order status. Wat voor statussen zijn dat?
Sarah (PO): [05:00] Nou, we hebben: New, Processing, Shipped, Delivered, en Cancelled. Maar eigenlijk is dat vrij technisch. Misschien moeten we klantvriendelijkere labels gebruiken?
Tom (SM): [05:20] Goed idee. Dat kunnen we als aparte taak nemen - UX teksten bepalen.
Lisa (Dev): [05:35] En als een order Shipped is, willen we dan tracking informatie tonen? Want dat betekent dat we moeten integreren met DHL of PostNL API's.
Sarah (PO): [05:50] Oh ja! Dat willen klanten zeker. Ze willen weten wanneer hun pakket aankomt. Maar we hebben die integratie nog niet geloof ik?
Lisa (Dev): [06:05] Nee, die hebben we niet. Dat is een grote klus. Dat moeten we echt apart nemen. Voor nu kunnen we misschien een simpele "verwachte leverdatum" tonen die we handmatig invullen?
Sarah (PO): [06:25] Hmm, dat is niet ideaal maar misschien voor v1 ok. Laat me dat even checken met de stakeholders.
Mark (BA): [06:45] En wat kunnen ze doen met die orders? Alleen kijken, of ook acties uitvoeren?
Sarah (PO): [07:00] Goeie. Ik denk dat ze in ieder geval een order moeten kunnen annuleren als die nog niet shipped is. En misschien ook het afleveradres kunnen wijzigen?
Lisa (Dev): [07:20] Order annuleren is niet zo moeilijk, maar adres wijzigen wordt complex. Dan moeten we valideren of het nog kan, nieuwe shipping costs berekenen, en eigenlijk een hele order update flow bouwen.
Tom (SM): [07:45] Klinkt als dat ook een apart item moet worden. Laten we die scope bewaken.
Sarah (PO): [08:00] Oké, laten we voor nu alleen focussen op: inloggen, orders zien, status bekijken, en een order annuleren als die nog niet shipped is.
Mark (BA): [08:20] Perfect. En moet er een dashboard komen met statistieken? Zoals "je hebt 3 openstaande orders" of zo?
Sarah (PO): [08:30] Ja, dat zou mooi zijn! Een soort overview pagina met een samenvatting, en dan een lijst met details.
Lisa (Dev): [08:45] Voor de dashboard statistieken - we moeten even kijken naar performance. Als we voor elke klant real-time aggregaties doen op duizenden orders kan dat traag worden.
Sarah (PO): [09:00] Hoeveel orders hebben klanten gemiddeld?
Mark (BA): [09:05] Dat moet ik opzoeken. Ik denk de meeste hebben minder dan 50, maar sommige B2B klanten hebben er honderden.
Lisa (Dev): [09:20] OK, dan moeten we daar rekening mee houden in het design. Misschien alleen de laatste 12 maanden tonen?
Sarah (PO): [09:30] Ja, dat lijkt redelijk.
Tom (SM): [09:40] We hebben nu nog 5 minuten. Kunnen we dit proberen te summarizen zodat we iets hebben om verder mee te werken?
Sarah (PO): [09:50] Ja. Dus: Customer Portal waar Contacts kunnen inloggen, een dashboard zien met een overzicht van hun orders, en een lijst met order details. Ze kunnen orders bekijken en annuleren als ze nog niet shipped zijn.
Lisa (Dev): [10:10] En we gebruiken Experience Cloud, maar moeten nog uitzoeken: licenties, welke account types, permission model voor B2B vs B2C, en performance voor grote volumes.
Mark (BA): [10:30] Ik pak de business vragen: welke account types, permission model, en klantvriendelijke status labels. Plus ik zoek op wat het gemiddeld aantal orders per klant is.
Tom (SM): [10:50] Mooi. En Lisa, jij checkt de technische kant: licenties, API limits, en performance strategie?
Lisa (Dev): [11:00] Yep.
Tom (SM): [11:05] Perfect. Dan was dit het eerste item. Zullen we doorpakken naar het volgende?
Sarah (PO): [11:15] Ja. Het tweede item is eigenlijk een verbetering van de huidige opportunity process. Onze sales reps klagen dat ze te veel handmatige stappen moeten doen...
Tom (SM): [11:30] Wacht, ik zie dat we nog maar 3 minuten hebben. Zullen we dit volgende week pakken en eerst deze goed uitwerken?
Sarah (PO): [11:40] Goed plan.
Tom (SM): [11:45] Top, dan sluiten we af. Bedankt allemaal!
[Meeting ends at 12:00]

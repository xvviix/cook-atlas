/* CookAtlas app logic — loads dishes.json + countries.json, renders explorer, modal, favorites, surprise. */
const FLAGS = {"Italy":"🇮🇹","Greece":"🇬🇷","Peru":"🇵🇪","Portugal":"🇵🇹","Spain":"🇪🇸","Japan":"🇯🇵","Türkiye":"🇹🇷","China":"🇨🇳","France":"🇫🇷","Indonesia":"🇮🇩","Mexico":"🇲🇽","Serbia":"🇷🇸","India":"🇮🇳","Poland":"🇵🇱","United States":"🇺🇸","Vietnam":"🇻🇳","Brazil":"🇧🇷","Croatia":"🇭🇷","Korea":"🇰🇷","Lebanon":"🇱🇧","Georgia":"🇬🇪","Hungary":"🇭🇺","Colombia":"🇨🇴","Thailand":"🇹🇭","Philippines":"🇵🇭","Argentina":"🇦🇷","Germany":"🇩🇪","Russia":"🇷🇺","Malaysia":"🇲🇾","Morocco":"🇲🇦","Romania":"🇷🇴","Chile":"🇨🇱","Czech Republic":"🇨🇿","South Africa":"🇿🇦","Bulgaria":"🇧🇬","Austria":"🇦🇹","Palestine":"🇵🇸","Egypt":"🇪🇬","Ethiopia":"🇪🇹","Canada":"🇨🇦","Tunisia":"🇹🇳","Iran":"🇮🇷","Ukraine":"🇺🇦","Lithuania":"🇱🇹","Syria":"🇸🇾","Algeria":"🇩🇿","Netherlands":"🇳🇱","Saudi Arabia":"🇸🇦","Ecuador":"🇪🇨","England":"🇬🇧"};
const EMOJI_RULES = [
  [/soup|stew|broth|chowder|gumbo|pho\b|ramen|laksa|bouillabaisse|gazpacho|locro|lablabi|fanesca|encebollado|harira|chorba|shorba|ash |miso|wonton|hotpot|fondue/i,"🍲"],
  [/cake|torte|tarte|pie\b|pastry|strudel|tart\b| Gateau|gâteau|brownies|muffin|cupcake|pudding|flan|panna cotta|tiramisu|baklava|basbousa|kanafeh|kunafa|knafeh|crème|creme brulee|eclair|éclair|macaron|meringue|pavlova|doughnut|donut|churros|beignet|bambalouni|loukoum|halva|barfi|laddu|jalebi|mooncake|kasutera|castella|bibingka|leche flan|tres leches|sticky toffee|bread pudding|kutia|rvani|revani|kalb el|makroudh|maamoul|cookies|biscuit|stroopwafel|appeltaart|speculoos|melomakarona|kourabiedes|vasilopita|sachertorte|dobos|kürtőskalács|chimney|gulab|kulfi|falooda|shrikhand|payasam|kheer|pitha|gelato|ice cream|sundae|sorbet|granita|cannoli|sfogliatella|cassata|semifreddo|zuccotto|babka|rugelach|hamantaschen|maple|nanaimo|butter tart|saskatoon|tourtière dessert/i,"🍰"],
  [/pizza|flatbread|manakish|manoushe|lahmacun|pide|focaccia|fougasse|khachapuri|naan\b|paratha|roti\b|chapati|kulcha|bhatura|puri\b|dosa\b|idli|uttapam|appam|injera|kisra|balady|pita\b|markouk|taboon|saj\b|yufka|gtest/i,"🍕"],
  [/burger|sandwich|shawarma|doner|döner|gyro|falafel|kebab|koobideh|kofta|souvlaki|satay|yakitori|kushikatsu|banh mi|arepa|taco|burrito|quesadilla|enchilada|choripan|bondiola|broodje|kapsalon|patat|beavertail|donair|smoked meat|po'boy|reuben|clubhouse|panini|tramezzini|porchetta|porquetta|cemita|torta\b|muffuletta|kati roll|vada pav|pav bhaji|dabeli|frankie|shami|chapli|seekh|tikka\b|soujouk|sujuk|pastirma|kielbasa|bratwurst|currywurst|weisswurst|frankfurter|hot dog|banger|cornish pasty|samosa|samboosa|sambusa|empanada|pastel\b|coxinha|acaraje|kibble|kibbeh|arancini|suppli|croquette|bitterballen|bitterbal|frikandel|kaassouffle|scotch egg|scotchegg|pakora|bhaji\b|fritter|fritters|fritada|tempura|karaage|kakiage|korokke|menchi|harumaki|gyoza|mandu|wonton|dim sum|har gow|siu mai|bao\b|mantou|manti\b|pelmeni|vareniki|varenyky|pierogi|khinkali|momo\b|spring roll|egg roll|lumpia|risoles|pastilla|bastilla|briouat|samsa|chebureki|borek|börek|burek|sambusak|fatayer|sfiha|esfiha|kibbeh|coxhina/i,"🌯"],
  [/noodle|pasta|spaghetti|ramen|udon|soba|yakisoba|pad thai|pad see|lo mein|chow mein|dan dan|biang|lamian|japchae|jjajang|naengmyeon|kalguksu|laksa|khao soi|khao pad|mee\b|bihun|kwetiau|pancit|palabok|spaghetti|penne|lasagna|ravioli|gnocchi|carbonara|alfredo|pesto|bolognese|macaroni|orzo|pastitsio|moussaka of pasta|haluski|spätzle|spaetzle/i,"🍝"],
  [/rice|biryani|biriyani|paella|risotto|jollof|kabsa|mandi|machboos|bukhari|koshari|maqluba|maqluba|mansaf|kebseh|nasi|bibimbap|kimchi fried|chahan|takikomi|sekihan|onigiri|maki|sushi\b|chirashi|poke\b|locro|arroz|gallo pinto|moros|congri|kejriwal|kedgeree|khichdi|pongal|curd rice|lemon rice|tamarind|coconut rice|nasi lemak|nasi goreng|nasi campur|briyani|tahdig|tahchin|zereshk|baghali|adelo|jollof|waakye|thieboudienne|couscous|maftoul|moghrabieh|freekeh|bulgur|tabbouleh|fattoush salad rice|pilaf|plov|osh\b|javaher|shirin|morasa|tachin|dampokht|kateh|saleeg|harees|jareesh|areesh|aseeda|asida|thareed|thrid|saltah|fahsa|kabsah|madfoon|mathbi|haneeth|zurbian|sayadiyah|kedjenou|attiéké|attieke|fufu|ugali|pap\b|nsima|sadza|injera firfir|genfo|kinche|bajiya|pilau|wali wa nazi/i,"🍚"],
  [/salad|tabbouleh|fattoush|shopska|olivier|vinegret|coleslaw|caesar|nicoise|niçoise|greek salad|caprese|panzanella|som tum|larb|nam tok|yum\b|gado gado|karedok|pecel|urap|lawar|acar|kimchi\b|oisobagi|kaktugi|nabak|dongchimi|sunomono|horenso|kinpira|hijiki|edamame salad|poke salad|kachumber|kachumbari|raita|sambal salad|mezze salad|salata|salatet|torshi|shirazi|mast o khiar|zeytoon parvardeh|borani|kashk bademjan salad|muhammara salad|baba ganoush|hummus|tahini salad|tarator|tzatziki|cacik|snow pea|wax bean/i,"🥗"],
  [/pancake|crepe|crêpe|blini|blintz|dosa|injera|appam|poffertjes|oliebollen|kaiserschmarrn|palacsinta|clatite|qatayef|katayef|msemen|msemmen|baghrir|harsha|rghaif|malawah|malawach|paratha|lacha|murtabak|mutabbaq|murtabak|roti canai|roti jala|apam balik|martabak|terang bulan|banh xeo|banh cuon|jianbing|congee pancake|hotteok|bindaetteok|pajeon|kimchijeon|okonomiyaki|takoyaki taiyaki|dorayaki|taiyaki|imagawayaki|egg waffle|stroopwafel|waffle|wafel|gaufre|lefse|potato pancake|deruny|latke|rosti|rösti|hash brown|fritters/i,"🥞"],
  [/egg|omelette|omelet|shakshuka|shakshouka|menemen|tortilla espanola|frittata|quiche|eggah|ejjeh|kuku\b|nargesi|khagina|anda|egg curry|egg roast|kachumar|Scotch egg|tea egg|century egg|oyakodon|tamagoyaki|chasoba|ajitsuke|marinated egg|brik\b|brik tounsi|pastel de nata egg|torta pascualina/i,"🍳"],
  [/chicken|duck|turkey|goose|poulet|pollo|frango|galinha|ayam|gai\b|manok|ji\b|dak\b|tori|yakitori|tikka|butter chicken|tandoori|korma|vindaloo|madras|rogan|chettinad|kozhi|naatu|pepper chicken|gongura|dhaba|karahi|kadai|balti|dhansak|pathia|jalfrezi|bhuna|dopiaza|rezala|chaap|tangdi|murgh|palak chicken|methi|saag|pasanda|mulligatawny|cock-a-leekie|scotch broth chicken|waterzooi|poule au pot|blanquette|coq au vin|poulet|suprême|ballotine|galantine|terrine chicken|pâté chicken|chicken liver|foie|confit|magret|cassoulet|choucroute chicken|huhn|hendl|wiener backhendl|paprikahuhn|csirke|paprikás|pörkölt chicken|kotopoulo|psito|giouvetsi chicken|pastitsio chicken|kotoleta|shish tawook|shish taouk|musakhan|musakhan|maqluba chicken|kabsa chicken|mandi chicken|shawarma chicken|machboos chicken|margooga|mareq|haneeth chicken|mathbi chicken|madfoon chicken|khanfaroosh|balaleet chicken|nikhaif|jareesh chicken|matazeez|marasee|qursan|hawaij chicken|doro wat|doro wot|yassa|mafe chicken|domoda|groundnut chicken|muamba chicken|piri piri chicken|peri peri|frango|canja|caldo verde chicken|feijoada chicken|galinhada|tutu|frango com quiabo|bobó chicken|vatapa chicken|moqueca chicken|acaraje chicken|sancocho chicken|ajiaco chicken|bandeja chicken|paisa chicken|pechuga|arroz con pollo|pollo saltado|pollo a la brasa|anticuchos chicken|pachamanca chicken|pato no tucupi|tacaca chicken|cuy chicken|seco chicken|aguadito|caldo de gallina|tallarines chicken|lomo chicken|ceviche chicken|tiradito chicken|causa chicken|papa rellena chicken|ocopa chicken|pachamanca|locro chicken|encebollado chicken|fritada chicken|hornado chicken|seco de pollo|guatita chicken|bolon chicken|tigrillo chicken|menestra chicken|biche chicken|viche chicken|arroz marinero chicken|encocado chicken|camarones chicken|plantain chicken|patacon chicken|yassa chicken|attiéké chicken|kedjenou chicken|alloco chicken|foutou chicken|sauce graine chicken|sauce arachide chicken|tiep chicken|yassa poulet|mafe poulet|suya chicken|pepper soup chicken|egusi chicken|ogbono chicken|oha chicken|banga chicken|edikang chicken|afang chicken|efo chicken|gbegiri chicken|ewedu chicken|amala chicken|moi moi chicken|akara chicken|dodo chicken|jollof chicken|fried rice chicken|nigerian chicken|asun chicken|nkwobi chicken|isi ewu chicken|ugba chicken|abacha chicken|okpa chicken|ukwa chicken|ofioku chicken/i,"🍗"],
  [/beef|steak|burger patty|carpaccio|bresaola|biltong|jerky|bobotie|potjiekos|seswaa|lechón|lechon|cochinillo|lechazo|cordero|lamb|mutton|goat|cabrito|chevon|kidney|tripe|menudo|pozole|birria|barbacoa|carnitas|cochinita|chilorio|machaca|cecina|tasajo|tlayuda|mole|asado|parrilla|matambre|vacio|entraña|morcilla|chorizo|salchicha|butifarra|sobrasada|lomo|solomillo|entrecot|chuletón|txuleta|cachopo|fabada|callos|rabo de toro|carcamusa|migas|olla|pote|caldereta|marmitako|bacalao beef|porra|ajoblanco beef|haggis|neeps|black pudding|white pudding|stornoway|clapshot|rumbledethumps|cullen skink beef|scotch pie|bridie|forfar|lorne|square sausage|tattie scone beef|full breakfast beef|ulster fry|dublin coddle|boxty beef|colcannon beef|champ beef|crubeens|drisheen|skirts|spiced beef|corned beef|cottage pie|cottage|shepherd's pie|lancashire hotpot|scouse|lobscouse|panackelty|staffordshire|potato pie|meat and potato|steak and kidney|steak pie|steak bake|greggs|pasties beef|cornish beef|bedfordshire|forfar bridie|peh|scotch pie beef|mince and tatties|stovies|clootie beef|two fat ladies beef|faggots|peas pudding beef|pease pudding|haslet|pork pie|melton|gala pie|scotch egg beef|sausage roll|bangers|mash beef|toad in the hole|bubble and squeak beef|ploughman's beef|beef wellington|wellington|sunday roast|roast beef|yorkshire pudding|horseradish beef|shepherd pie|lancashire|hotpot|irish stew|guinness stew|dublin stew|coddle|bacon and cabbage|boiled bacon|champ|cottage pie beef|fish pie beef|ocean pie|kedgeree beef|coronation beef|tikka beef|rogan beef|madras beef|vindaloo beef|phall|dhansak beef|balti beef|karahi beef|keema|kofta beef|mince beef|seekh beef|chapli beef|shami beef|hussaini|galouti|kakori|patiala|raan|nihari|paya|siri paya|haleem|khichda|biryani beef|tahari beef|yakhni beef|pulao beef|kabsa beef|mandi beef|maqluba beef|mansaf|musakhan beef|koobideh|koobideh|barg|jujeh|jujeh|tahchin beef|ghormeh|gheimeh|gormeh|khoresh|fesenjan beef|dizi|abgoosht|kale pache|koofteh|kotlet|dolmeh beef|kashk beef|mirza beef|baghali beef|tahdig beef|sholeh|halim beef|adasi beef|sambar beef|rasam beef|kootu beef|avial beef|olan beef|ishtu beef|meen beef|konju beef|njandu beef|duck roast beef|thoran beef|mezhukkupuratti beef|erachi beef|varutharacha beef|theeyal beef|pulissery beef|moru beef|kaalan beef|onavalu beef|chakka beef|kappa beef|puttu beef|appam beef|idiyappam beef|string hopper beef|kiri beef|hoppers beef|lamprais|kottu|kothu|hoppers beef|pittu beef|dosai beef|vadai beef|adai beef|pesarattu beef|punugulu beef|bonda beef|mysore beef|upma beef|poha beef|khichdi beef|dal beef|tadka beef|makhani beef|shahi beef|malai beef|methi beef|saag beef|palak beef|sarson beef|rajma beef|chole beef|chana beef|lobia beef|dal makhani beef|panchmel beef|gatte beef|ker sangri beef|laal maas|jungli maas|safed maas|papad beef|rogan josh|gosht beef|yakni beef|tabak maaz|aab gosht|marchwangan beef|kokur beef|nadru beef|haaq beef|dum aloo beef|lyodur beef|tshaman beef|phirni beef|kahwa beef|gushtaba beef|rista beef|kebab beef|lawasa beef|sheermal beef|bakarkhani beef|tandoori beef|rumali beef|nalli beef|biryani beef|haleem beef/i,"🥩"],
  [/fish|salmon|tuna|cod\b|haddock|hake|sea bass|bream|mackerel|herring|sardine|anchovy|trout|carp|pike|perch|zander|tilapia|catfish|mahi|snapper|grouper|halibut|sole\b|plaice|flounder|turbot|monkfish|swordfish|marlin|shark|eel\b|unagi|anago|octopus|tako\b|squid|calamari|cuttlefish|shrimp|prawn|ebi\b|lobster|crab|kani\b|crawfish|langoustine|scallop|hotate|clam|asari|mussel|oyster|kaki\b|uni\b|ikura|mentaiko|tarako|shirako|fugu|hamachi|maguro|toro\b|sake\b|shake salmon|saba\b|aji\b|iwashi|sanma|hokke|kinmedai|nodoguro|hirame|karei|anago|hamo|suppon|dojou|ayu\b|unagi|kabayaki|shirayaki|nitsuke|nimono|shioyaki|teriyaki fish|saikyo|kasuzuke|nanban|escabeche|ceviche|tiradito|leche de tigre|poke\b|laulau fish|lomi fish|haupia fish|kalua fish|pipikaula|poke bowl|gravlax|gravad lax|matjes|rollmops|herring|brathering|fischbrötchen|backfisch|forelle|saibling|renke|felchen|bodensee|fischsuppe|bouillabaisse fish|cotriade|ttoro|suquet|zarzuela|sarsuela|caldereta fish|marmitako fish|bacalao|bacalhau|bolinhos|pataniscas|caldeirada|cataplana|arroz de marisco|feijoada fish|moqueca fish|bobó fish|vatapá fish|acarajé fish|tacacá fish|pato fish|pirão|peixada|camarao fish|casquinha|siri fish|lagosta fish|polvo fish|lula fish|camarão fish|peixe fish|bacalao fish|brandade|brandada|anchoiade|pissaladière fish|soupe de poisson|haddock fish|fish and chips|fish pie|kedgeree|kippers|kipper|bloater|manx kipper|craster|smoked haddock|cullen skink|finnan haddie|haddie|partan bree|scottish salmon|cured salmon|beetroot salmon|pickled herring|soused herring|jansson|janssons|gravadlax|rakfisk|lutefisk|lutfisk|surströmming|tunnbröd fish|toast skagen|skagen|rimmad lax|inkokt lax|laxpudding|laxlåda|uovas|forshmak|gefilte|chopped herring|whitefish|lox\b|sturgeon|caviar|roe\b|bottarga|karasumi|uni pasta|vongole|puttanesca fish|baccalà|stoccafisso|moscardini|seppie|totani|gamberi|scampi|astice|granchio|cozze|vongole|telline|cannolicchi|ostriche|ricci|datteri|fasolari|peoci|sardoni|alici|acciughe|sgombri|tonno|pesce spada|dentice|orata|branzino|spigola|rombo|sogliola|rana pescatrice|coda di rospo|gallinella|tracina|scorfano|cernia|sarago|pagello|occhialone|occhiata|mormora|salpa|cefalo|muggine|spigola|persico|trota|carpa|luccio|pesce gatto|coregone|lavarello|agone|alborella|triotto|temolo|salmerino|trota salmonata|fario|iridea|marble trout|huchen|danube salmon|zander|sandre|perche|sandre|brochet|silure|esturgeon|saumon|truite|omble|omble chevalier|coregone|lavaret|fera|ablette|gardon|rotengle|brème|carpe|tanche|vandoise|chevesne|hotu|barbeau|goujon|loche|chabot|épinoche|ablette/i,"🐟"],
  [/bread|bun\b|roll\b|baguette|ciabatta|fougasse|pain|brioche|challah|babka|rugelach|pumpernickel|rye\b|vollkorn|brot|brötchen|semmel|kaiser|pretzel|bretzel|laugen|stollen|christstollen|panettone|pandoro|colomba|pastiera bread|casatiello|torta pasqualina bread|piadina|crescentina|tigelle|borlengo|panigacci|testaroli|farinata bread|cecina bread|socca bread|panisse|pissaladiere bread|fougasse bread|socca|tourte|pâté bread|tourtiere bread|pork pie bread|scotch pie bread|bridie bread|bedfordshire bread|cornish bread|forfar bread|peh bread|mince pie bread|steak pie bread|steak bake bread|greggs bread|pasties bread|pasty bread|cornish pasty|sausage roll bread|bangers bread|mash bread|toad bread|bubble bread|ploughman bread|yorkshire bread|horseradish bread|shepherd bread|lancashire bread|hotpot bread|scouse bread|lobscouse bread|panackelty bread|staffordshire bread|potato pie bread|meat and potato bread|steak and kidney bread|suet bread|dumpling bread|dumplings|wonton bread|har gow bread|siu mai bread|bao bread|mantou bread|manti bread|pelmeni bread|vareniki bread|varenyky bread|pierogi bread|khinkali bread|momo bread|spring roll bread|egg roll bread|lumpia bread|risoles bread|pastilla bread|bastilla bread|briouat bread|samsa bread|chebureki bread|borek bread|börek bread|burek bread|sambusak bread|fatayer bread|sfiha bread|esfiha bread|kibbeh bread|arancini bread|suppli bread|croquette bread|bitterballen bread|frikandel bread|kaassouffle bread|scotch egg bread|pakora bread|bhaji bread|fritter bread|tempura bread|karaage bread|kakiage bread|korokke bread|menchi bread|harumaki bread|gyoza bread|mandu bread/i,"🍞"],
  [/cheese|halloumi|feta|halloumi|kashkaval|kasseri|graviera|mizithra|manouri|kopanisti|tirokafteri|melitzanosalata cheese|dakos cheese|bougatsa cheese|tiropita|spanakopita cheese|kotopita cheese|kremydopita cheese|kolokithopita cheese|prasopita cheese|galatopita cheese|sarikopites cheese|kalitsounia cheese|lychnarakia cheese|pitta cheese|pita cheese|banitsa cheese|tikvenik cheese|mekitsa cheese|tutmanik cheese|banichka cheese|gibanica|burek cheese|pita sa sirom|zeljanica|sirnica|krompirusa|maslenica|tufahije cheese|sogan-dolma cheese|bosanski lonac cheese|cevapi cheese|pljeskavica cheese|sudzukice cheese|kebapi cheese|kajmak|ajvar cheese|urnebes|pindjur|ljutenica cheese|kyopolou|shopska cheese|snezhanka|katak|lyutenitsa cheese|kavarma cheese|kebapche cheese|kyufte cheese|mish mash|chomlek|gyuvech cheese|kavarma cheese|sarmi cheese|zelnik cheese|klin|patatnik|kapama|drusan kebab cheese|kavarma kebab cheese|shish cheese|adana cheese|urfa cheese|beyti cheese|iskender cheese|doner cheese|dürüm cheese|pide cheese|lahmacun cheese|manti cheese|testi cheese|tandir cheese|kuzu cheese|dana cheese|tavuk cheese|balik cheese|karides cheese|kalamar cheese|ahtapot cheese|midye cheese|hamsi cheese|levrek cheese|cipura cheese|palamut cheese|lakerda cheese|çiroz cheese|tarama|haydari|acili ezme|atom cheese|şakşuka cheese|humus cheese|babaganuş cheese|muhammara cheese|mercimek cheese|yayla cheese|tarhana cheese|işkembe cheese|kelle paça cheese|tuzlama cheese|beyran cheese|analı kızlı cheese|yuvalama cheese|topalak cheese|düğün cheese|keşkek cheese|aşure|höşmerim|kazandibi|tavuk göğsü|sütlaç|fırın sütlaç|güllaç|baklava cheese|künefe|katmer|şöbiyet|bülbül|dilber dudağı|hanım göbeği|vezir parmağı|kalburabastı|şekerpare|revani|lokma|tulumba|halka|kadayif|muhallebi|keşkül|sütlü nuriye|cennet künkü|sambali|taş kadayıf|ekmek kadayıfı|kaymaklı|ayva tatlısı|kabak tatlısı|incir tatlısı|elma tatlısı|armut tatlısı|şeftali tatlısı|kayısı tatlısı|erik tatlısı|kiraz tatlısı|vişne tatlısı|çilek tatlısı|dut tatlısı|üzüm tatlısı|nar tatlısı|portakal tatlısı|limon tatlısı|mandalina tatlısı|greyfurt tatlısı|ananas tatlısı|muz tatlısı|kivi tatlısı|avokado tatlısı|hindistan cevizi/i,"🧀"],
  [/potato|fries|chips|patat|pommes|kartoffel|knödel|kartoffelpuffer|reibekuchen|schupfnudel|knodel|halusky|strapacky|bryndzove|lokse|trdelnik potato|langos potato|tócsni|lapcsánka|berliner potato|kartoffelsalat|bratkartoffel|himmel und erde|gröstl|tiroler|kaspressknödel|spinatknödel|semmelknödel|serviettenknödel|kartoffelknödel|zwetschgenknödel|marillenknödel|topfenknödel|germknödel|dampfnudel|rohrnudel|buchteln|kaiserschmarrn potato|apfelstrudel potato|topfenstrudel|millirahmstrudel|salzburger nockerl|linzer potato|esterhazy|dobos potato|sacher potato|punschkrapfen|kardinalschnitte|malakoff|mohnzelten|nusszelten|kletzenbrot|zelten|stollen potato|buchteln potato|golatschen|topfentascherl|nusskipferl|vanillekipferl|lebkuchen potato|zimtsterne|springerle|spekulatius|pepernoten|kruidnoten|taaitaai|banketstaaf|gevulde speculaas|amandelstaaf|appelbol|appelflap|tompouce|moorkop|bossche bol|saucijzenbrood|worstenbrood|frikandelbrood|kaasbroodje|croissantje|koffiebroodje|carré confiture|boule de berlin|merveilleux|cramique|craquelin|gosette|cougnou|cougnolle|spéculoos potato|pain d'épices|nonnette|gâteau battu|gâteau du curé|gâteau ardéchois|gâteau nantais|gâteau basque|pastis landais|tourteau fromager|tourte de blettes|pogne|saint-genix|brioche des rois|galette des rois|pithiviers|tarte tropézienne|tarte bourdaloue|tarte normande|tarte tatin potato|clafoutis|far breton|kouign-amann|gâteau breton|quatre-quarts|madeleine|financier|cannelé|macaron potato|paris-brest|opéra|fraisier|charlotte|bavarois|framboisier|cassis|marbre|savarain|baba au rhum|canelé|meringue potato|dacquoise|succès|progrès|joconde|roulé|bûche|galette charentaise|tourton|croustade|pastis gascon|cruche|millassou|flaugnarde|clafoutis potato|tourtou|fouace|pavé|gâteau creusois|gâteau corrézien|tarte aux pruneaux|tarte au sucre|tarte au maton|tarte al djote|tarte aux pommes potato|tarte aux cerises|tarte aux mirabelles|tarte aux quetsches|tarte aux myrtilles|tarte aux fraises|tarte au citron potato|tarte au chocolat|tarte fine|tarte sablée|tarte sucrée|tarte rustique|galette des rois potato|sablé breton|palet breton|traou mad|galettes bretonnes|crêpe dentelle|gavotte|tuile|langue de chat|boudoir|cuillère|rose de reims|biscuit de savoie|biscuit de reims|massepain|calisson|nougat|nougatine|croquante|grillage|chichi|churros potato|bugnes|merveilles|oreillettes|beignets potato|pets de nonne|sfinci|zeppole|struffoli|mostaccioli|susumelle|pitta|pitta 'mpigliata|dita d'apostolo|cartellate|calzoncelli|pettole|zeppole potato|sfinge|iris|arancine dolci|cassatelle|cudduraci|buccellato|cuccidati|totò|rami di napoli|piparelli|nacatole|susumelle potato|torrone|gianduiotto|baci|brutti ma buoni|cantucci|ricciarelli|cavallucci|pan coi santi|panforte|torta della nonna|torta caprese|torta paradiso|torta mantovana|torta sbrisolona|torta paesana|torta bertolina|torta del riso|torta degli addobbi|torta fritta|gnocco fritto|tigelle potato|crescentine potato|piadina potato|borlengo potato|panigacci potato|testaroli potato|farinata potato|cecina potato|socca potato|panisse potato/i,"🥔"],
];
function foodEmoji(title){
  for(const [re,emo] of EMOJI_RULES){ if(re.test(title)) return emo; }
  return "🍽️";
}
const GRADS = [
  "linear-gradient(135deg,#ffe3c2,#ffc199)","linear-gradient(135deg,#d8f3dc,#b7e4c7)",
  "linear-gradient(135deg,#ffdfd8,#ffc6b8)","linear-gradient(135deg,#e0e7ff,#c7d2fe)",
  "linear-gradient(135deg,#fef3c7,#fde68a)","linear-gradient(135deg,#ffe4ec,#fecdd3)",
  "linear-gradient(135deg,#e0f2fe,#bae6fd)","linear-gradient(135deg,#f3e8ff,#e9d5ff)"
];
function gradFor(id){ let h=0; for(const c of id) h=(h*31+c.charCodeAt(0))>>>0; return GRADS[h%GRADS.length]; }

let DISHES=[], COUNTRIES=[];
let activeCountry=null, favOnly=false, sortMode="country", visible=24, currentList=[];
let favs = new Set(JSON.parse(localStorage.getItem("cookatlas_favs")||"[]"));

const $ = id => document.getElementById(id);
const dishGrid=$("dishGrid"), countryGrid=$("countryGrid"), resultInfo=$("resultInfo");

function toast(msg){ const t=$("toast"); t.textContent=msg; t.hidden=false; clearTimeout(t._h); t._h=setTimeout(()=>t.hidden=true,2200); }
function saveFavs(){ localStorage.setItem("cookatlas_favs", JSON.stringify([...favs])); $("favCount").textContent=favs.size; }

function filtered(){
  const q=($("navSearch").value||$("heroSearch").value||"").trim().toLowerCase();
  let list=DISHES.filter(d=>{
    if(activeCountry && d.cuisine!==activeCountry) return false;
    if(favOnly && !favs.has(d.id)) return false;
    if(q && !(d.title+" "+d.cuisine+" "+d.about).toLowerCase().includes(q)) return false;
    return true;
  });
  if(sortMode==="az") list=[...list].sort((a,b)=>a.title.localeCompare(b.title));
  return list;
}

function renderCountries(){
  countryGrid.innerHTML="";
  COUNTRIES.forEach(c=>{
    const card=document.createElement("div");
    card.className="country-card"+(activeCountry===c.name?" active":"");
    card.tabIndex=0;
    card.innerHTML=`<span class="flag">${FLAGS[c.name]||"🌍"}</span><b></b><br><small>${c.dishes.length} dishes</small>`;
    card.querySelector("b").textContent=c.name;
    const pick=()=>{ activeCountry=(activeCountry===c.name?null:c.name); visible=24; renderCountries(); renderDishes();
      $("clearCountry").hidden=!activeCountry;
      if(activeCountry) document.getElementById("explore").scrollIntoView({behavior:"smooth"});
    };
    card.onclick=pick; card.onkeydown=e=>{if(e.key==="Enter")pick();};
    countryGrid.appendChild(card);
  });
}

function cardEl(d){
  const el=document.createElement("article");
  el.className="dish-card"; el.tabIndex=0;
  const art=document.createElement("div"); art.className="dish-art"; art.style.background=gradFor(d.id); art.textContent=foodEmoji(d.title);
  const body=document.createElement("div"); body.className="dish-body";
  const star=favs.has(d.id)?"❤️":"🤍";
  body.innerHTML=`<span class="fav-star">${star}</span><div class="dish-meta"></div><h3></h3>`;
  body.querySelector("h3").textContent=d.title;
  body.querySelector(".dish-meta").textContent=`${FLAGS[d.cuisine]||"🌍"} ${d.cuisine} · ${d.steps.length} steps`;
  el.append(art,body);
  const open=()=>openModal(d.id);
  el.onclick=open; el.onkeydown=e=>{if(e.key==="Enter")open();};
  return el;
}

function renderDishes(){
  currentList=filtered();
  dishGrid.innerHTML="";
  currentList.slice(0,visible).forEach(d=>dishGrid.appendChild(cardEl(d)));
  resultInfo.textContent=`Showing ${Math.min(visible,currentList.length)} of ${currentList.length} dishes`+
    (activeCountry?` · ${FLAGS[activeCountry]||""} ${activeCountry}`:"")+(favOnly?" · ❤ favorites":"");
  $("loadMore").style.display=currentList.length>visible?"inline-block":"none";
}

/* MODAL */
let modalId=null;
function openModal(id){
  const d=DISHES.find(x=>x.id===id); if(!d) return;
  modalId=id;
  $("mHero").style.background=gradFor(d.id);
  $("mEmoji").textContent=foodEmoji(d.title);
  $("mCuisine").textContent=`${FLAGS[d.cuisine]||"🌍"} ${d.cuisine} cuisine`;
  $("mTitle").textContent=d.title;
  $("mAbout").textContent=d.about;
  const ing=$("mIng"); ing.innerHTML="";
  d.ingredients.forEach(t=>{ const li=document.createElement("li"); li.textContent=t; li.onclick=()=>li.classList.toggle("done"); ing.appendChild(li); });
  const st=$("mSteps"); st.innerHTML="";
  d.steps.forEach(t=>{ const li=document.createElement("li"); li.textContent=t; st.appendChild(li); });
  const tp=$("mTips"); tp.innerHTML="";
  d.tips.forEach(t=>{ const li=document.createElement("li"); li.textContent=t; tp.appendChild(li); });
  const sc=$("mSources"); sc.innerHTML="";
  d.sources.forEach(s=>{ const li=document.createElement("li"); const a=document.createElement("a");
    a.href=s.url; a.target="_blank"; a.rel="noopener"; a.textContent=s.text; li.appendChild(a); sc.appendChild(li); });
  updateFavBtn();
  $("modalBackdrop").hidden=false;
  document.body.style.overflow="hidden";
  document.querySelector(".modal").scrollTop=0;
}
function closeModal(){ $("modalBackdrop").hidden=true; document.body.style.overflow=""; renderDishes(); }
function stepModal(dir){
  const list=currentList.length?currentList:DISHES;
  let i=list.findIndex(d=>d.id===modalId); if(i<0)i=0;
  openModal(list[(i+dir+list.length)%list.length].id);
}
function updateFavBtn(){ $("mFav").textContent=favs.has(modalId)?"❤️ Saved in favorites":"🤍 Save to favorites"; }

/* SURPRISE */
function surprise(){
  const box=$("surpriseCard");
  const picks=["🍕","🍜","🌮","🍣","🥘","🍛","🥟","🍔","🍰","🍲","🥗","🍤"];
  let n=0;
  box.querySelector(".surprise-emoji, #surpriseCard div");
  const emo=box.querySelector(".surprise-emoji");
  const iv=setInterval(()=>{
    emo.textContent=picks[n%picks.length]; n++;
    if(n>12){ clearInterval(iv);
      const d=DISHES[Math.floor(Math.random()*DISHES.length)];
      box.innerHTML="";
      const e=document.createElement("div"); e.className="surprise-emoji"; e.textContent=foodEmoji(d.title);
      const t=document.createElement("h3"); t.textContent=d.title;
      const c=document.createElement("p"); c.textContent=`${FLAGS[d.cuisine]||"🌍"} ${d.cuisine}`;
      const b=document.createElement("button"); b.className="btn btn-primary"; b.textContent="Open recipe →";
      b.onclick=()=>openModal(d.id);
      box.append(e,t,c,b);
    }
  },90);
}

/* EVENTS */
function onSearch(fromHero){
  if(fromHero){ $("navSearch").value=$("heroSearch").value; }
  else{ $("heroSearch").value=$("navSearch").value; }
  visible=24; renderDishes();
}
$("heroSearch").addEventListener("input",()=>onSearch(true));
$("navSearch").addEventListener("input",()=>onSearch(false));
$("heroSearchBtn").onclick=()=>{ onSearch(true); document.getElementById("explore").scrollIntoView({behavior:"smooth"}); };
$("sortSel").onchange=e=>{ sortMode=e.target.value; renderDishes(); };
$("loadMore").onclick=()=>{ visible+=36; renderDishes(); };
$("favToggle").onclick=()=>{ favOnly=!favOnly; $("favToggle").setAttribute("aria-pressed",favOnly); visible=24; renderDishes(); };
$("navFav").onclick=()=>{ if(!favOnly) $("favToggle").click(); };
$("clearCountry").onclick=()=>{ activeCountry=null; $("clearCountry").hidden=true; renderCountries(); renderDishes(); };
$("surpriseBtn").onclick=surprise;
$("modalClose").onclick=closeModal;
$("modalBackdrop").addEventListener("click",e=>{ if(e.target.id==="modalBackdrop") closeModal(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("modalBackdrop").hidden) closeModal(); });
$("mPrev").onclick=()=>stepModal(-1);
$("mNext").onclick=()=>stepModal(1);
$("mRandom").onclick=()=>openModal(DISHES[Math.floor(Math.random()*DISHES.length)].id);
$("mFav").onclick=()=>{ if(favs.has(modalId)){favs.delete(modalId);toast("Removed from favorites");}else{favs.add(modalId);toast("❤️ Saved to favorites!");} saveFavs(); updateFavBtn(); if(window.commSyncFav) window.commSyncFav(modalId); };
$("copyIng").onclick=()=>{
  const d=DISHES.find(x=>x.id===modalId);
  navigator.clipboard.writeText(`${d.title} — ingredients:\n• `+d.ingredients.join("\n• ")).then(()=>toast("📋 Ingredients copied!"));
};
$("navToggle").onclick=()=>document.querySelector(".nav-links").classList.toggle("open");

/* INIT — MERGE: load from the Django API first, fall back to static JSON. */
const COOKATLAS_API = window.COOKATLAS_API || {};
function fetchFirst(urls){
  return urls.filter(Boolean).reduce(
    (p, u) => p.catch(() => fetch(u).then(r => { if(!r.ok) throw new Error(u); return r.json(); })),
    Promise.reject(new Error("no URL"))
  );
}
Promise.all([fetchFirst([COOKATLAS_API.dishes, COOKATLAS_API.dishesStatic, "dishes.json"]), fetchFirst([COOKATLAS_API.countries, COOKATLAS_API.countriesStatic, "countries.json"])])
  .then(([dj,cj])=>{
    DISHES=dj.dishes; COUNTRIES=cj;
    $("statDishes").textContent=DISHES.length;
    $("statCountries").textContent=COUNTRIES.length;
    $("statSources").textContent=DISHES.reduce((n,d)=>n+d.sources.length,0).toLocaleString();
    saveFavs(); renderCountries(); renderDishes();
  })
  .catch(()=>{ dishGrid.innerHTML="<p>⚠️ Couldn't load dishes.json — please serve this folder over HTTP (e.g. <code>python3 -m http.server</code>).</p>"; });

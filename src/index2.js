function mapLanguageNameToCode(languageName) {
    const languageMap = {
        english: 'en-US',
        spanish: 'es-ES',
        hebrew: 'he-IL',
        russian: 'ru-RU',
        arabic: 'ar-SA',
        italian: 'it-IT'// Add more language mappings as needed
    };

    const lowercaseLanguageName = languageName.toLowerCase();

    if (lowercaseLanguageName in languageMap) {
        return languageMap[lowercaseLanguageName];
    } else {
        return null;
    }
}

async function translateText(source, target, text) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURI(text)}`;

    console.log({
        url
    });

    try {
        const response = await fetch(url);
        const data = await response.json();
        const translatedText = data[0][0][0];
        console.log(`Translated text: ${translatedText}`);
        return translatedText;
    } catch (error) {
        console.error('Error translating text:', error);
        return 'error';
    }
}

function setTranslationLanguage(userInput) {
    const pattern = /translate\s+from\s+(\w+)\s+to\s+(\w+)/i;
    let translateFrom = '';
    let translateTo = '';
    const matches = userInput.match(pattern);

    if (matches) {
        translateFrom = matches[1];
        translateTo = matches[2];
    }

    return [translateFrom, translateTo];
}

function analyzeText(speechResult) {
    let translateFrom = '';
    let translateTo = '';
    let src = '';
    let trg = '';

    console.log("analyzeText   " + speechResult);

    if (speechResult.toLowerCase().includes("speak english")) {
        console.log('back to english')
        src = 'en-US'
    } else if (speechResult.toLowerCase().includes("show commands")) {
        console.log("translate from X to Y")
        console.log("change language to X")
        console.log('speak english')
    } else if (speechResult.toLowerCase().includes("translate from")) {
        [translateFrom,translateTo] = setTranslationLanguage(speechResult);
    } else if (speechResult.toLowerCase().includes("change language to")) {
        translateFrom = speechResult.toLowerCase().replace("change language to", "").trim();
        console.log("Language Updated: " + translateFrom);
    }

    console.log([{
        translateFrom
    }, {
        translateTo
    }]);

    try {
        if (translateFrom)
            src = mapLanguageNameToCode(translateFrom);
        if (translateTo)
            trg = mapLanguageNameToCode(translateTo);
    } catch (e) {
        console.error(e.message);
    }

    return [src, trg];
}

function option1() {
    const SpeechRecognition = webkitSpeechRecognition;
    const SpeechGrammarList = window.webkitSpeechGrammarList;
    const SpeechRecognitionEvent = webkitSpeechRecognitionEvent;
    const recognition = new SpeechRecognition();

    var colors = ['aqua', 'azure', 'beige', 'bisque', 'black', 'blue', 'brown', 'chocolate', 'coral', 'crimson', 'cyan', 'fuchsia', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'indigo', 'ivory', 'khaki', 'lavender', 'lime', 'linen', 'magenta', 'maroon', 'moccasin', 'navy', 'olive', 'orange', 'orchid', 'peru', 'pink', 'plum', 'purple', 'red', 'salmon', 'sienna', 'silver', 'snow', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'white', 'yellow'];

    if (SpeechGrammarList) {
        var speechRecognitionList = new SpeechGrammarList();
        var grammar = '#JSGF V1.0; grammar colors; public <color> = ' + colors.join(' | ') + ' ;'
        speechRecognitionList.addFromString(grammar, 1);
        recognition.grammars = speechRecognitionList;
    }

    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let initialLanguage = 'en-US';
    let utterance = null;
    let [translateFrom, translateTo] = ['', ''];
    let isTTSActive = false;

    recognition.lang = initialLanguage;
    recognition.start();

    recognition.onresult = async function(event) {
        console.log({ event });

        const speechResult = event.results[event.results.length - 1][0].transcript;
        console.log('recognition: speechResult', speechResult);

        const [newTranslateFrom, newTranslateTo] = analyzeText(speechResult);

        if (newTranslateTo) {
            translateTo = newTranslateTo;
        }
        if (newTranslateFrom) {
            translateFrom = newTranslateFrom;
        }

        if (translateTo) {
            const translationResult = await translateText(translateFrom, translateTo, speechResult);

            utterance = new SpeechSynthesisUtterance(translationResult);
            utterance.lang = translateTo;
            recognition.stop();

            recognition.lang = translateFrom;
            console.log('update utterance language', { language: translateTo, translationResult });
        } else if (translateFrom) {
            console.log('update recognition language', { language: translateFrom });
            recognition.stop();

            recognition.lang = translateFrom;
            utterance = new SpeechSynthesisUtterance(speechResult);
            utterance.lang = translateFrom;
        } else {
            utterance = new SpeechSynthesisUtterance(speechResult);
            utterance.lang = initialLanguage;
        }

        if (utterance) {
            utterance.onstart = function() {
                isTTSActive = true;
                recognition.stop();
            };

            recognition.onend = recognition.onspeechend = recognition.onerror = function() {
                setTimeout(() => {
                    recognition.start();
                }, 1000);
            };

            recognition.start();
        }
    };
}

option1();

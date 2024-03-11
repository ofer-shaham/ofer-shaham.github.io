import initScrollReveal from "./scripts/scrollReveal";
import initTiltEffect from "./scripts/tiltAnimation";
import { targetElements, defaultProps } from "./data/scrollRevealConfig";

initScrollReveal(targetElements, defaultProps);
initTiltEffect();
function mapLanguageNameToCode(languageName) {
    const languageMap = {
        english: 'en-US',
        spanish: 'es-ES',
        hebrew: 'he-IL',
        russian: 'ru-RU',
        arabic: 'ar-SA',
        italian: 'it-IT'// Add more language mappings as needed
    };

    // Convert the language name to lowercase for case-insensitive matching
    const lowercaseLanguageName = languageName.toLowerCase();

    // Check if the language name exists in the map
    if (lowercaseLanguageName in languageMap) {
        return languageMap[lowercaseLanguageName];
    } else {
        return null;
        // Return null if the language name is not found
    }
}

async function translateText(source, target, text) {
    console.log('translateText')

    //     const sourceText = 'בוקר טוב';
    // const targetLanguage = 'fr'; // French
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURI(text)}`

    // const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(sourceText)}`;
    console.log({
        url
    })

    return fetch(url).then(response=>response.json()).then(data=>{
        console.log({
            data
        })
        const translatedText = data[0][0][0];
        console.log(`Translated text: ${translatedText}`);
        return translatedText
    }
    ).catch(error=>{
        console.error('Error translating text:', error);
        return 'error'
    }
    );

}

function setTranslationLanguage(userInput) {
    // Regular expression pattern to extract source and target languages
    const pattern = /translate\s+from\s+(\w+)\s+to\s+(\w+)/i;
    let translateFrom = '';
    let translateTo = '';
    // Extract source and target languages using the regex pattern
    const matches = userInput.match(pattern);

    if (matches) {
        translateFrom = matches[1];
        // Extracted source language
        translateTo = matches[2];
        // Extracted target language
    }

    return [translateFrom, translateTo];

}

function analyzeText(speechResult) {
    let translateFrom = '';
    let translateTo = '';
    let src = ''
      , trg = ''
    // Log the recognized speech
    console.log("analyzeText   " + speechResult);
    if (speechResult.toLowerCase().includes("speak english")) {
        console.log('back to english')
        src = 'en-US'
    }// 
    else if (speechResult.toLowerCase().includes("show commands")) {
        console.log("translate from X to Y")
        console.log("change language to X")
        console.log('speak english')

    }// 
    else if (speechResult.toLowerCase().includes("translate from")) {
        [translateFrom,translateTo] = setTranslationLanguage(speechResult);

    }// Check if the user wants to switch the language
    else if (speechResult.toLowerCase().includes("change language to")) {
        // Extract the desired language from the speech
        translateFrom = speechResult.toLowerCase().replace("change language to", "").trim();

        // Log the updated translateFrom
        console.log("Language Updated: " + translateFrom);

        // Update the translateFrom of the recognition instance

    }
    console.log([{
        translateFrom
    }, {
        translateTo
    }])

    try {
        if (translateFrom)
            src = mapLanguageNameToCode(translateFrom)
        if (translateTo)
            trg = mapLanguageNameToCode(translateTo)
    } catch (e) {
        console.error(e.message)
    }
    return [src, trg]
}
function addGrammer(recognition) {
    const grammar = "#JSGF V1.0; grammar colors; public <color> = aqua | azure | beige | bisque | black | blue | brown | chocolate | coral | crimson | cyan | fuchsia | ghostwhite | gold | goldenrod | gray | green | indigo | ivory | khaki | lavender | lime | linen | magenta | maroon | moccasin | navy | olive | orange | orchid | peru | pink | plum | purple | red | salmon | sienna | silver | snow | tan | teal | thistle | tomato | turquoise | violet | white | yellow ;";
    const speechRecognitionList = new webkitSpeechGrammarList();
    speechRecognitionList.addFromString(grammar, 1);
    return  speechRecognitionList;
 }
navigator.mediaDevices.getUserMedia({
    audio: true
}).then(function(stream) {
    // Create a new SpeechRecognition object
    let recognition = new webkitSpeechRecognition();
    if (webkitSpeechGrammarList)
        recognition.grammar = addGrammer()
    // Set the continuous mode to true
    recognition.continuous = true;

    // Set the default language
    let initialLanguage = 'en-US';
    let utterance = null
    let[translateFrom,translateTo] = ['', '']
    // Create a flag to track if TTS is speaking
    let isTTSActive = false;
    // Start the recognition
    recognition.lang = initialLanguage
    recognition.start();

    // Event handler for when speech is recognized
    recognition.onresult = async function(event) {
        // Get the recognized speech
        console.log({
            event
        })
        const speechResult = event.results[event.results.length - 1][0].transcript;
        console.log('recognition: speechResult', speechResult)
        const [newTranslateFrom,newTranslateTo] = analyzeText(speechResult)
        if (newTranslateTo) {
            translateTo = newTranslateTo
        }
        if (newTranslateFrom) {
            translateFrom = newTranslateFrom
        }
        //on updating from lang

        //repeat mode or translate mode
        if (translateTo) {
            const translationResult = await translateText(translateFrom, translateTo, speechResult, );

            // Use speechSynthesis to repeat the recognized speech in the chosen language
            utterance = new SpeechSynthesisUtterance(translationResult);
            utterance.lang = translateTo;
            recognition.stop();

            recognition.lang = translateFrom
            console.log('update utterance language', {
                language: translateTo,
                translationResult
            })

        } else if (translateFrom) {
            console.log('update recognition language', {
                language: translateFrom
            })
            recognition.stop();

            recognition.lang = translateFrom
            // recognition.start();
            utterance = new SpeechSynthesisUtterance(speechResult);
            utterance.lang = translateFrom;

        } else {
            utterance = new SpeechSynthesisUtterance(speechResult);
            utterance.lang = initialLanguage;

            // utterance.lang = translateFrom;
            // console.log('utterance lang', {
            //     lang: translateFrom
            // }, {
            //     speechResult
            // })

        }
        if (utterance) {
            // Set the flag to indicate TTS is active

            // Event handler for when TTS starts
            utterance.onstart = function() {
                isTTSActive = true;

                // Stop the recognition when TTS starts
                recognition.stop();
            }
            ;

            // Event handler for when TTS ends
            utterance.onend = function() {
                isTTSActive = false;

                // Start the recognition again when TTS ends
                recognition.start();

                // Reset the flag to indicate TTS is no longer active
            }
            // Speak the utterance
            speechSynthesis.speak(utterance);

        }

    }
    ;

    // Event handler for errors
    recognition.onerror = function(event) {
        console.log("Error occurred: " + event.error);
    }
    ;

    // Event handler for when the recognition ends
    recognition.onend = function() {
        console.log("Recognition ended");

        // Start the recognition again if TTS is not active
        // setTimeout(()=>{
        //     if (!isTTSActive) {
        //         // recognition.stop();

        //         recognition.start();
        //     }
        // }
        // , 1000)

    }
    recognition.onstart = function() {
        console.log("Recognition started");

    }

    // setInterval(()=>{
    //     console.info(recognition)
    // }
    // , 2000)

}).catch(function(error) {
    console.log("Error accessing microphone: " + error);
});


        }

    }
    ;

    // Event handler for errors
    recognition.onerror = function(event) {
        console.log("Error occurred: " + event.error);
    }
    ;

    // Event handler for when the recognition ends
    recognition.onend = function() {
        console.log("Recognition ended");

        // Start the recognition again if TTS is not active
        // setTimeout(()=>{
        //     if (!isTTSActive) {
        //         // recognition.stop();

        //         recognition.start();
        //     }
        // }
        // , 1000)

    }
    recognition.onstart = function() {
        console.log("Recognition started");

    }

    // setInterval(()=>{
    //     console.info(recognition)
    // }
    // , 2000)

}).catch(function(error) {
    console.log("Error accessing microphone: " + error);
});

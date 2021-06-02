const fs = require('fs');
const { TranscribeStreamingClient, StartMedicalStreamTranscriptionCommand, StartStreamTranscriptionCommand, Specialty, Type } = require('@aws-sdk/client-transcribe-streaming');

function wait(time) {
    return new Promise(resolve => {
        setTimeout(resolve, time);
    })
}

async function* audioSource() {
    const chunkSize = 10 * 1000;
    const fileBuf = fs.readFileSync('./testFile.wav');
    let index = 0;
    let i = 0;
    while(index < fileBuf.length) {
    // while(index < chunkSize * 60) {
        const chunk = fileBuf.slice(index, Math.min(index + chunkSize, fileBuf.byteLength));
        await wait(300);
        yield chunk;
        index += chunkSize;
    }
}

(async () => {
    console.log(`***start: [${new Date()}]`);
    async function * audioStream() {
        for await(const chunk of audioSource()) {
            yield {AudioEvent: {AudioChunk: chunk}}
        }
    }
    const client = new TranscribeStreamingClient({region: "us-west-2"});

    const command = new StartStreamTranscriptionCommand({
        LanguageCode: 'en-US',
        MediaSampleRateHertz: 16000,
        MediaEncoding: 'pcm',
        AudioStream: audioStream(),
        // Specialty: Specialty.CARDIOLOGY,
        // Type: Type.CONVERSATION
    });
    try {
        const data = await client.send(command, {sessionTimeout: 2000});
        // console.log(data.TranscriptResultStream)
        for await (const event of data.TranscriptResultStream) {
            if(event.TranscriptEvent) {
                const results = event.TranscriptEvent.Transcript.Results;
                results.map(result => {
                    (result.Alternatives || []).map(alternative => {
                        const str = alternative.Items.map(item => item.Content).join(' ');
                        console.log(str)
                    })
                })
            }
        }
        console.log('DONE', data);
        client.destroy();
    } catch(e) {
        console.log('ERROR: ', e);
        process.exit(1);
    }
})()




// const fs = require('fs');
// const { TranscribeStreamingClient,  StartStreamTranscriptionCommand } = require('@aws-sdk/client-transcribe-streaming');

// function wait(time) {
//     return new Promise(resolve => {
//         setTimeout(resolve, time);
//     })
// }

// async function* audioSource() {
//     const chunkSize = 10 * 1000;
//     const fileBuf = fs.readFileSync('./testFile.wav');
//     let index = 0;
//     let i = 0;
//     while(index < fileBuf.length) {
//     // while(index < chunkSize * 60) {
//         const chunk = fileBuf.slice(index, Math.min(index + chunkSize, fileBuf.byteLength));
//         await wait(300);
//         yield chunk;
//         index += chunkSize;
//     }
// }

// (async () => {
//     console.log(`***start: [${new Date()}]`);
//     async function * audioStream() {
//         for await(const chunk of audioSource()) {
//             yield {AudioEvent: {AudioChunk: chunk}}
//         }
//     }
//     const client = new TranscribeStreamingClient({region: "us-west-2"});

//     const command = new StartStreamTranscriptionCommand({
//         LanguageCode: 'en-US',
//         MediaSampleRateHertz: 16000,
//         MediaEncoding: 'pcm',
//         AudioStream: audioStream(),

//     });
//     try {
//         const data = await client.send(command, {sessionTimeout: 2000});
//         // console.log(data.TranscriptResultStream)

//         for await (const event of data.TranscriptResultStream) {
//             for (const result of event.TranscriptEvent?.Transcript?.Results || []) {
//               if (result.IsPartial === false) {
//                 console.log(result.Alternatives[0].Items);
//               }
//             }
//           }
//         console.log('DONE', data);
//         client.destroy();
//     } catch(e) {
//         console.log('ERROR: ', e);
//         process.exit(1);
//     }
// })()

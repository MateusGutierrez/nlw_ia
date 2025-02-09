import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from 'zod'
import { createReadStream } from "fs";
import { openai } from "../lib/openai";

export async function createTranscriptionRoute(app: FastifyInstance) {
    app.post('/videos/:videoId/transcription', async (req) => {
        const paramsSchema = z.object({
            videoId: z.string().uuid(),
        })
        
        const { videoId } = paramsSchema.parse(req.params)
        
        const bodySchema = z.object({
            prompt: z.string(),
        })

        const { prompt } = bodySchema.parse(req.body)

        const video = await prisma.video.findFirstOrThrow({
            where: {
                id: videoId,
            }
        })

        const videoPath = video.path

        const audioReadStream = createReadStream(videoPath)

        const res = await openai.audio.transcriptions.create({
            file: audioReadStream,
            model: 'whisper-1',
            language: 'en',
            response_format: 'json',
            temperature: 0,
            prompt,
        })

        const transcription = res.text

        await prisma.video.update({
            where:{
                id: videoId,
            },
            data: {
                transcription,
            }
        })

        return { transcription }
    })
}
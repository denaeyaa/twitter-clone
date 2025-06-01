import formidable from "formidable"
import { tweetTransformer } from "~~/server/transformers/tweet.js"
import { createTweet } from "../../../db/tweets.js"
import { createMediaFile } from "../../../db/mediaFiles.js"
import { uploadToCloudinary } from "../../../utils/cloudinary.js"

export default defineEventHandler(async (event) => {

    const form = formidable({})

    const response = await new Promise((resolve, reject) => {
        form.parse(event.req, (err, fields, files) => {
            if (err) {
                reject(err)
            }
            resolve({ fields, files })
        })
    })

    const { fields, files } = response

    const userId = event.context?.auth?.user?.id

    // Pastikan `fields.text` adalah String tunggal
    // Jika `fields.text` adalah array, ambil elemen pertamanya
    const text = Array.isArray(fields.text) ? fields.text[0] : fields.text;

    const tweetData = {
        text: text, // Menggunakan `text` yang sudah dipastikan String
        authorId: userId
    }

    // Pastikan `fields.replyTo` adalah String tunggal atau null
    // Jika `fields.replyTo` adalah array, ambil elemen pertamanya
    let replyTo = Array.isArray(fields.replyTo) ? fields.replyTo[0] : fields.replyTo;

    // Tambahan penanganan jika `replyTo` menjadi string "undefined" atau "null"
    if (replyTo === 'null' || replyTo === 'undefined') {
        replyTo = null;
    }

    if (replyTo) { // Cukup periksa apakah `replyTo` ada dan bukan null
        tweetData.replyToId = replyTo
    }

    const tweet = await createTweet(tweetData)

    const filePromises = Object.keys(files).map(async key => {
        const file = files[key]

        const cloudinaryResource = await uploadToCloudinary(file.filepath)

        return createMediaFile({
            url: cloudinaryResource.secure_url,
            providerPublicId: cloudinaryResource.public_id,
            userId: userId,
            tweetId: tweet.id
        })
    })

    await Promise.all(filePromises)

    return {
        tweet: tweetTransformer(tweet)
    }
})
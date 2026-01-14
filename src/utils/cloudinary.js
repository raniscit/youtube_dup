import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async(localfilepath) => {
    try {
        if(!localfilepath)return null;
        const response = await cloudinary.v2.uploader.upload(localfilepath,{
            resource_type: "auto"
        }) 
        // file has been uploaded successfully
        console.log("successfully uploaded on cloudinary");
        console.log(response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localfilepath);
        //remove the locally saved temporary file as the uploaded operation got failed
        return null;
    }
}

export {uploadOnCloudinary}
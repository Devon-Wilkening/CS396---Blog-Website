# Process from end to end 
1. Changes are pushed from machine to GitHub repo.
2. Actions is triggered and does the following:
   - FIRST JOB STARTS. HANDLES BUILDING
   - Sets up node stuff.
   - Creates Docker image using the Docker file in the repo. This Docker file is just a server for the site to run on. It is acting as our "remote server."
   - Saves the image to a file or "artifact."
   - Approval from one of the admins is needed for deployment to happen. After approval is granted:
3. SECOND JOB STARTS. HANDLES DEPLOYMENT
   - The Docker image is downloaded from the file (or artifact) it was saved to in the previous job.
   - The image is then pushed to Docker Hub, where it can be accessed by anyone.
4. Now that the image is on Docker Hub, it can be pulled onto a local machine with the follwing command. (Docker must be installed on your machine): `docker pull devonwilkening/blog-server:latest`
5. The image can now be ran with the following command. The ports must be mapped correctly, which is why 3000 is specified: `docker run -d -p 3000:3000 devonwilkening/blog-server:latest`
6. Now the site can be accessed at the url localhost:3000 on the machine.
7. "Watchtower" is running in the background continously updated the image pull onto the local machine every 10 seconds, ensuring the image is the most recent.
8. Once the Docker Image is pulled onto a machine and running correctly, changes made to this repo are reflected on the site running in the container in about 5-6 minutes (depends on how quickly admins grant approval)

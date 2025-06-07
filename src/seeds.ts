import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import { floor, random } from 'lodash';
import axios from 'axios';
import { createCanvas } from 'canvas';

dotenv.config({});

function avatarColor(): string {
  const colors: string[] = [
    '#3f53fa',
    '#40cd97',
    '#bf5d26',
    '#1b6cdc',
    '#a27707',
    '#8a2be2',
    '#660066',
    '#2acaea',
    '#66cccc',
    '#8b0000',
    '#ccff00',
    '#ff7373',
    '#ffc0cb',
    '#8e6b43',
    '#d07b69',
    '#6e612f',
    '#38390a',
    '#34481a',
    '#82b441',
    '#91c949',
    '#ffd249',
    '#e1a42b',
    '#a9b8a4',
    '#ffdcc6',
    '#e91b21',
    '#1f871e',
    '#2dc22b',
    '#8bd717',
    '#00a650',
    '#e91b21',
    '#b35242'
  ]
  return colors[floor(random(0.9) * colors.length)];
}

// genaerate avatarImage from canvas toadd to cloudinary
function generateAvatar(text: string, backgroundColor: string, foregroundColor = 'white') {
  const canvas = createCanvas(200, 200);
  const context = canvas.getContext('2d');

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = 'normal 80px, sans-serif';
  context.fillStyle = foregroundColor;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);    // AvatarImage will have a initial Username Letter

  return canvas.toDataURL('image/png');   // generate png image file from canvas
}

function getUniqueAdjectives(count: number): string[] {
  const uniqueNames = new Set<string>();
  while (uniqueNames.size < count) {
    uniqueNames.add(faker.person.firstName());
  }
  return Array.from(uniqueNames);
}

async function seedUserData(count: number): Promise<void> {
  const uniqueUsernames = getUniqueAdjectives(count);
  let i = 0;
  try {
    for(i = 0; i < count; i++) {
      const username: string = uniqueUsernames[i];
      const color = avatarColor();
      const avatar = generateAvatar(username.charAt(0).toUpperCase(), color);

      const body = {
        username,
        email : faker.internet.email(),
        password: '12345',
        avatarColor: color,
        avatarImage: avatar
      }
      console.log(`***ADDING USER TO DATABASE*** - ${i + 1} of ${count} - ${username}`);
      await axios.post(`${process.env.API_URL}/signup`, body);
    }
  } catch (error: any) {
    console.log(error?.response?.data);
  }
}

seedUserData(10);

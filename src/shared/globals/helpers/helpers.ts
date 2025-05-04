export class Helpers {
  static firstLetterUppercase(str: string): string {
    const valueString = str.toLowerCase();
    return valueString
      .split(' ')
      .map((value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`)
      .join('');
  }

  static lowerCase(str: String): String {
    return str.toLowerCase();
  }

  static generateRandomIntegers(intergerLength: number): number {
    const characters = '0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < intergerLength; i++) {
      result = characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return parseInt(result, 10);
  }

  static parseJson(prop: string): any {
    try {
      return JSON.parse(prop);
    } catch (error) {
      return prop;
    }
  }
}

//static method belongs to class and not object is needed to clall the method

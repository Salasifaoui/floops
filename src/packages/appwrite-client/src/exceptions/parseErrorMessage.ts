// import * as Sentry from '@sentry/react-native';

const VAR_RENAMES: Record<string, string> = {
  oldPassword: 'Current Password',
};
export function parseErrorMessage(error: any): { title: string; description: string } {
  const message = error?.message || error?.toString() || 'An unexpected error occurred';

  /**
   * Case: Case:  Invalid `password` param: Pas...
   * title: Invalid Password
   * description: after 'param: '
   *
   */
  if (message.includes('param:')) {
    try {
      const titleParam = message.split('param: ')[0];
      const descParam = message.split('param: ')[1];
      // normalize the title
      const title: string = titleParam.replaceAll('`', ''); // Capitalize on each word
      const titleCapitalized = title
        .split(' ')
        .map((word) => {
          if (VAR_RENAMES[word]) {
            return VAR_RENAMES[word];
          }
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
      return {
        title: titleCapitalized, // normalize the title
        description: descParam,
      };
    } catch (error) {
      // Sentry.captureException(error);
      console.error('Failed to parse error message:', error);
    }
  }

  return {
    title: 'Oops! Something went wrong',
    description: message,
  };
}

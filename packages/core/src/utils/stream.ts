export const readStream = async (reader: { read: () => PromiseLike<{ done: any; value: any; }> | { done: any; value: any; }; }) => {
    let streamData = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Stream has been read completely
        break;
      }
  
      // Assuming the stream is a Uint8Array
      const chunk = new TextDecoder().decode(value);
      streamData += chunk;
    }
    return streamData;
  };
  
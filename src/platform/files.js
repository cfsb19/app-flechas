// Gravar um ficheiro gerado no aparelho (exportações).

const isNative = () => !!(globalThis.Capacitor && globalThis.Capacitor.isNativePlatform && globalThis.Capacitor.isNativePlatform());

/** Na web descarrega via Blob; no APK grava em cache e abre o menu Partilhar do Android. */
export async function saveFile(name, text, mime) {
  if (isNative()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'), import('@capacitor/share'),
    ]);
    const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, url: uri, dialogTitle: 'Guardar ou enviar exportação' });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

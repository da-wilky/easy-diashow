<script lang="ts">
  import { i18n } from './i18n.svelte'

  let dialog: HTMLDialogElement
  let message = $state('')
  let action = $state('')
  let resolve: (confirmed: boolean) => void = () => {}

  export function ask(text: string, confirmLabel: string) {
    message = text
    action = confirmLabel
    dialog.returnValue = ''
    dialog.showModal()
    return new Promise<boolean>((r) => (resolve = r))
  }
</script>

<dialog bind:this={dialog} onclose={() => resolve(dialog.returnValue === 'confirm')}>
  <div class="stack">
    <p>{message}</p>
    <div class="row">
      <span class="spacer"></span>
      <button onclick={() => dialog.close()}>{i18n.m.cancel}</button>
      <button class="danger solid" onclick={() => dialog.close('confirm')}>{action}</button>
    </div>
  </div>
</dialog>

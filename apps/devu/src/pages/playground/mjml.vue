<script setup lang="ts">
import type { HeadlessLiveCodesConfig } from '@/composables/use-headless-livecodes'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CodeMirror } from '@/components/code-mirror'
import { PlaygroundLayout, PlaygroundOutput } from '@/components/playground'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useHeadlessLiveCodes } from '@/composables/use-headless-livecodes'

const route = useRoute()

const mjml = ref(route.query.mjml
  ? String(route.query.mjml)
  : `<mjml>
  <mj-head>
    <mj-title>Sphero Mini - Mix and Match</mj-title>
  </mj-head>
  <mj-body>
    <mj-raw>
      <!-- Top Bar -->
    </mj-raw>
    <mj-section background-color="#FF3FB4" background-url="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-Top-BarBG.jpg" padding="0px">
      <mj-column>
        <mj-image width="46px" href="https://www.sphero.com" src="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-launch-logotop.png" align="center" alt="Sphero"></mj-image>
      </mj-column>
    </mj-section>
    <mj-spacer height="20px"></mj-spacer>
    <mj-raw>
      <!-- Logos and Title -->
    </mj-raw>
    <mj-section background-color="#FCFCFD" background-url="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-002ATopBGwhite.jpg" padding="0px">
      <mj-column>
        <mj-image width="125px" alt="This is the world's smallest robotic ball (that we know of)" src="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-002A-MiniLogo.png" padding="0px" href="https://www.sphero.com/sphero-mini"></mj-image>
        <mj-image alt="Mix and Match, Charge and Play." src="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-mixandmatch.png" href="https://www.sphero.com/sphero-mini" width="547px" padding="0px"></mj-image>
      </mj-column>
    </mj-section>
    <mj-raw>
      <!-- Split Crane and Text -->
    </mj-raw>
    <mj-section background-color="#FCFCFD" padding-top="20px" padding-bottom="20px" padding-left="25px">
      <mj-column vertical-align="middle">
        <mj-text font-family="arial" font-size="16px" align="left" color="#808080"><span style="color:#0098CE"><b>Colorful, interchangeable</b></span> shells allow you to switch one out to suit your mood. <span style="color:#3CD52E"><b>Remove the shell to charge.</b></span></mj-text>
        <mj-image alt="Buy Shells" href="https://store.sphero.com/products/sphero-mini-shells" src="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-002A-buyshellsbutton.png" align="left" width="188px"></mj-image>
      </mj-column>
      <mj-column vertical-align="middle">
        <mj-image alt="Mix and Match Shells" href="https://store.sphero.com/products/sphero-mini-shells" src="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-002A-RightCrane.jpg" width="325px" padding="0px"></mj-image>
      </mj-column>
    </mj-section>
    <mj-raw>
      <!-- Get Your Robot -->
    </mj-raw>
    <mj-section padding="0px" background-url="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-002A-getminiBG.jpg" background-color="#FF3FB4">
      <mj-column vertical-align="middle">
        <mj-image alt="GET YOUR ROBOT" href="https://www.sphero.com/sphero-mini" src="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-002A-blueboxmini.jpg" width="300px" padding="0px"></mj-image>
      </mj-column>
      <mj-column vertical-align="middle">
        <mj-spacer height="50px"></mj-spacer>
        <mj-text font-size="18px" align="center" color="#ffffff" font-weight="100" font-style="italic" letter-spacing="1px" padding-bottom="2px" font-family="Arial" line-height="1"><b>GET YOUR ROBOT</b></mj-text>
        <mj-text font-size="14px" align="center" color="#ffffff" font-weight="100" padding-bottom="0px" font-family="Arial" line-height="1.5">Sphero Mini fits a huge experience into a tiny robot the size of a ping pong ball. It’s fun, ok?</mj-text>
        <mj-spacer height="15px"></mj-spacer>
        <mj-button font-size="16px" href="https://store.sphero.com/collections/sphero-mini" font-family="arial" background-color="#fff" color="#EE3C96" inner-padding="5px 35px" border-radius="15px"><i>BUY MINI</i></mj-button>
        <mj-spacer height="50px"></mj-spacer>
      </mj-column>
    </mj-section>
    <mj-raw>
      <!-- Get Extra Shells -->
    </mj-raw>
    <mj-section padding="0px" background-color="#00A3D9" direction="rtl" background-url="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email002a-greenBG3.jpg">
      <mj-column vertical-align="middle">
        <mj-image alt="GET EXTRA SHELLS" href="https://store.sphero.com/collections/sphero-mini" src="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-002A-Shells.jpg" width="300px" padding="0px"></mj-image>
      </mj-column>
      <mj-column vertical-align="middle">
        <mj-spacer height="50px"></mj-spacer>
        <mj-text font-size="18px" align="center" color="#ffffff" font-weight="100" font-style="italic" letter-spacing="1px" padding-bottom="2px" font-family="Arial" line-height="1"><b>GET EXTRA SHELLS</b></mj-text>
        <mj-text font-size="14px" align="center" color="#ffffff" font-weight="100" padding-bottom="0px" font-family="Arial" line-height="1.5">Neon pink, orange, blue, green or classic Sphero white. Buy one. Or two. Or all.</mj-text>
        <mj-spacer height="15px"></mj-spacer>
        <mj-button font-size="16px" href="https://store.sphero.com/products/sphero-mini-shells" font-family="arial" background-color="#fff" color="#00A3D9" inner-padding="5px 25px" border-radius="15px"><i>BUY SHELLS</i></mj-button>
        <mj-spacer height="50px"></mj-spacer>
      </mj-column>
    </mj-section>
    <mj-raw>
      <!-- Bottom Graphic -->
    </mj-raw>
    <mj-section background-color="#fff" padding="0px">
      <mj-column>
        <mj-image width="600px" padding="0px" href="https://www.sphero.com/sphero-mini" src="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-002A-Bottomgraphic.jpg" align="center" alt="Sphero Mini - Drive, Code, Game."></mj-image>
      </mj-column>
    </mj-section>
    <mj-raw>
      <!-- Bottom Bar -->
    </mj-raw>
    <mj-section padding="0px" background-url="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-launch-bottombargradiantBG.png" background-color="#F15822">
      <mj-column>
        <mj-image width="160px" href="https://www.sphero.com" src="https://dmmedia.sphero.com/email-marketing/Sphero/Mini-Launch-email-launch-spherodotcombottom.png" align="center"></mj-image>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`)

const config = computed<HeadlessLiveCodesConfig>(() => ({
  markup: {
    language: 'mjml',
    content: mjml.value,
  },
}))
const { code, consoleEntries } = useHeadlessLiveCodes(config)
</script>

<template>
  <PlaygroundLayout v-slot="{ wrapperWidth }">
    <ResizablePanelGroup :direction="wrapperWidth > 640 ? 'horizontal' : 'vertical'">
      <ResizablePanel>
        <CodeMirror
          v-model="mjml"
          lang="html"
          class="rounded-none !border-0 !ring-0"
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <PlaygroundOutput
          v-bind="{
            code,
            consoleEntries,
            default: 'document',
            document: true,
            console: false,
            compiled: {
              default: 'markup',
              markup: true,
            },
          }"
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  </PlaygroundLayout>
</template>

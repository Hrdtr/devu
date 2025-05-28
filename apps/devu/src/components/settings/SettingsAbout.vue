<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener'
import { FileText, GitMerge, Heart, Target, UserCircle2 } from 'lucide-vue-next'
import { Separator } from '@/components/ui/separator'
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-row justify-between items-center gap-6">
      <div class="flex flex-col">
        <h1 class="text-2xl font-medium mb-1">
          Devu
        </h1>
        <p class="text-base text-muted-foreground mb-3">
          Open Source AI-Powered Development Utility
        </p>
        <p class="text-sm text-muted-foreground">
          Devu is a versatile development utility designed to enhance your coding workflow by providing a centralized suite of tools. Built with Tauri, it offers cross-platform support for Windows, macOS, and Linux.
        </p>
      </div>
      <img src="/icon.png" alt="Devu Logo" class="shrink-0 w-32 h-32 rounded-3xl shadow-md">
    </div>

    <div class="space-y-6">
      <div>
        <h2 class="text-lg font-medium mb-2 flex items-center gap-2">
          <Target class="w-4 h-4 text-primary" />
          Motivation
        </h2>
        <p class="text-sm text-muted-foreground pl-6">
          This application was created out of a need for a centralized utility app, aiming to reduce reliance on various single-purpose, potentially non-privacy-friendly online services.
        </p>
      </div>

      <div>
        <h2 class="text-lg font-medium mb-2 flex items-center gap-2">
          <UserCircle2 class="w-4 h-4 text-primary" />
          Maintainer
        </h2>
        <p class="text-sm text-muted-foreground pl-6">
          Devu is proudly maintained by <a href="https://github.com/Hrdtr" class="text-primary hover:underline" @click.prevent="openUrl('https://github.com/Hrdtr')">Herdi Tr.</a>
        </p>
      </div>

      <div>
        <h2 class="text-lg font-medium mb-2 flex items-center gap-2">
          <GitMerge class="w-4 h-4 text-primary" />
          Contributing
        </h2>
        <div class="pl-6 space-y-2">
          <p class="text-sm text-muted-foreground">
            We welcome contributions to Devu! If you'd like to contribute, please feel free to report issues, suggest enhancements, or submit pull requests on our <a href="https://github.com/Hrdtr/devu" class="text-primary hover:underline" @click.prevent="openUrl('https://github.com/Hrdtr/devu')">GitHub repository</a>.
          </p>
          <p class="text-sm text-muted-foreground">
            Have an idea for a new tool or feature you'd like to see integrated? Let us know by creating an issue!
          </p>
        </div>
      </div>

      <div>
        <h2 class="text-lg font-medium mb-2 flex items-center gap-2">
          <Heart class="w-4 h-4 text-primary" />
          Sponsorship
        </h2>
        <div class="pl-6 space-y-2">
          <p class="text-sm text-muted-foreground">
            Devu is a passion project, and your support can help keep it growing and accessible. We are currently seeking sponsors to help cover costs such as the Apple Developer Program (for signing and distributing the macOS app) and other publishing needs.
          </p>
          <p class="text-sm text-muted-foreground">
            If you find Devu useful and would like to support its development, please consider <a href="https://github.com/sponsors/Hrdtr" class="text-primary hover:underline" @click.prevent="openUrl('https://github.com/sponsors/Hrdtr')">sponsoring Herdi Tr. on GitHub Sponsors</a>.
          </p>
        </div>
      </div>

      <div>
        <h2 class="text-lg font-medium mb-2 flex items-center gap-2">
          <FileText class="w-4 h-4 text-primary" />
          License
        </h2>
        <p class="text-sm text-muted-foreground pl-6">
          Devu is licensed under the <a href="https://raw.githubusercontent.com/Hrdtr/devu/main/LICENSE" class="text-primary hover:underline" @click.prevent="openUrl('https://raw.githubusercontent.com/Hrdtr/devu/main/LICENSE')">GPL-3.0 License</a>.
        </p>
      </div>

      <Separator orientation="horizontal" class="my-6" />
      <p class="text-muted-foreground text-center">
        Thank you for using Devu!
      </p>
    </div>
  </div>
</template>

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accessibility } from 'lucide-react';
import { useAccessibility } from '@/hooks/useAccessibility';
import { LOCALES, setLocale, useI18n, type Locale } from '@/i18n';

export function AccessibilityCenter() {
  const { prefs, update } = useAccessibility();
  const { t, locale } = useI18n();

  return (
    <Card className="p-6 border-4 border-border space-y-6">
      <div className="flex items-center gap-2">
        <Accessibility className="w-6 h-6" />
        <h2 className="text-2xl font-bold uppercase">{t('a11y.title')}</h2>
      </div>

      <div className="space-y-4">
        <Row
          label={t('a11y.captions')}
          desc={t('a11y.captions.desc')}
          control={<Switch checked={prefs.captions} onCheckedChange={(v) => update({ captions: v })} />}
        />
        <Row
          label={t('a11y.highContrast')}
          desc={t('a11y.highContrast.desc')}
          control={<Switch checked={prefs.high_contrast} onCheckedChange={(v) => update({ high_contrast: v })} />}
        />
        <Row
          label={t('a11y.dyslexia')}
          desc={t('a11y.dyslexia.desc')}
          control={<Switch checked={prefs.dyslexia_font} onCheckedChange={(v) => update({ dyslexia_font: v })} />}
        />

        <div className="space-y-2">
          <Label>{t('a11y.fontScale')}: {prefs.font_scale.toFixed(2)}x</Label>
          <Slider min={0.8} max={1.6} step={0.05} value={[prefs.font_scale]} onValueChange={([v]) => update({ font_scale: v })} />
        </div>

        <div className="space-y-2">
          <Label>{t('a11y.speechRate')}: {prefs.speech_rate.toFixed(2)}x</Label>
          <Slider min={0.6} max={1.6} step={0.05} value={[prefs.speech_rate]} onValueChange={([v]) => update({ speech_rate: v })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>{t('a11y.timer')}</Label>
            <Select value={prefs.timer_visibility} onValueChange={(v: any) => update({ timer_visibility: v })}>
              <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t('a11y.timer.default')}</SelectItem>
                <SelectItem value="hidden">{t('a11y.timer.hidden')}</SelectItem>
                <SelectItem value="always">{t('a11y.timer.always')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('a11y.palette')}</Label>
            <Select value={prefs.colorblind_palette} onValueChange={(v: any) => update({ colorblind_palette: v })}>
              <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t('a11y.palette.default')}</SelectItem>
                <SelectItem value="protanopia">{t('a11y.palette.protanopia')}</SelectItem>
                <SelectItem value="deuteranopia">{t('a11y.palette.deuteranopia')}</SelectItem>
                <SelectItem value="tritanopia">{t('a11y.palette.tritanopia')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('a11y.locale')}</Label>
            <Select
              value={locale}
              onValueChange={(v: Locale) => { setLocale(v); update({ locale: v }); }}
            >
              <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, desc, control }: { label: string; desc: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label className="text-base">{label}</Label>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {control}
    </div>
  );
}

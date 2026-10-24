from django.db import models


class PlatformSettings(models.Model):
    data = models.JSONField(default=dict)

    class Meta:
        verbose_name = 'إعدادات المنصة'
        verbose_name_plural = 'إعدادات المنصة'

    @classmethod
    def get_solo(cls):
        instance, _ = cls.objects.get_or_create(pk=1)
        return instance


class SiteVisitDaily(models.Model):
    visit_date = models.DateField('التاريخ', unique=True)
    visits = models.PositiveBigIntegerField('عدد الزيارات', default=0)

    class Meta:
        verbose_name = 'زيارات الموقع اليومية'
        verbose_name_plural = 'زيارات الموقع اليومية'
        ordering = ['-visit_date']

    def __str__(self):
        return f'{self.visit_date}: {self.visits}'
